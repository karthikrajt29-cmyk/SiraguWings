import asyncio
import asyncpg
import ssl
from typing import AsyncGenerator, Optional, Tuple, Union
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from app.config import settings

_pool: Optional[asyncpg.Pool] = None

# asyncpg does not support the channel_binding query parameter.
# Strip it (and sslmode) from the DSN; pass ssl= explicitly instead.
_UNSUPPORTED_PARAMS = {"channel_binding", "sslmode"}


def _clean_dsn(dsn: str) -> Tuple[str, bool]:
    """Return (cleaned_dsn, requires_ssl) stripping params asyncpg doesn't understand."""
    parsed = urlparse(dsn)
    params = parse_qs(parsed.query, keep_blank_values=True)
    needs_ssl = params.pop("sslmode", ["disable"])[0].lower() in (
        "require", "verify-ca", "verify-full"
    )
    for key in _UNSUPPORTED_PARAMS:
        params.pop(key, None)
    new_query = urlencode({k: v[0] for k, v in params.items()})
    cleaned = urlunparse(parsed._replace(query=new_query))
    return cleaned, needs_ssl


async def _init_conn(conn: asyncpg.Connection) -> None:
    await conn.execute("SET search_path TO siraguwin, public")


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        dsn, needs_ssl = _clean_dsn(settings.database_url)
        ssl_ctx: Optional[Union[ssl.SSLContext, bool]] = None
        if needs_ssl:
            ssl_ctx = ssl.create_default_context()
        # Neon pauses idle databases; retry up to 3 times with backoff to
        # give the DB time to wake up on cold start.
        last_err: Exception = RuntimeError("unreachable")
        for attempt in range(3):
            try:
                _pool = await asyncpg.create_pool(
                    dsn,
                    min_size=1,
                    max_size=10,
                    ssl=ssl_ctx,
                    init=_init_conn,
                    setup=_init_conn,
                    timeout=30,
                )
                break
            except (asyncio.TimeoutError, OSError, asyncpg.PostgresConnectionError) as e:
                last_err = e
                if attempt < 2:
                    wait = 3 * (attempt + 1)
                    print(f"DB connect attempt {attempt + 1} failed, retrying in {wait}s…")
                    await asyncio.sleep(wait)
        else:
            raise last_err
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Wrap in a transaction so PgBouncer (transaction mode) pins the
        # backend connection for the entire request.  SET LOCAL scopes the
        # search_path to this transaction only.
        async with conn.transaction():
            await conn.execute("SET LOCAL search_path TO siraguwin, public")
            yield conn
