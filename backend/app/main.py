from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.exceptions import global_exception_handler
from app.database import close_pool, get_pool
from app.routers import auth
from app.routers.admin import router as admin_router

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "centers").mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — warm up DB connection pool
    await get_pool()
    yield
    # Shutdown — release pool
    await close_pool()


app = FastAPI(
    title="SiraguWings API",
    description=(
        "Backend API for SiraguWings — India's Parent Super App for coaching center management. "
        "Auth: Firebase Email/Password or Google OAuth. Admin endpoints require Admin role."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow admin web UI origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def catch_unhandled_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        origin = request.headers.get("origin", "")
        headers = {}
        if origin:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
        import traceback; traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
            headers=headers,
        )

# Global exception handler for unhandled errors
app.add_exception_handler(Exception, global_exception_handler)

# Static uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Routers
app.include_router(auth.router,   prefix="/auth",  tags=["Authentication"])
app.include_router(admin_router,  prefix="/admin", tags=["Admin"])


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "service": "siraguwin-api", "version": "1.0.0"}
