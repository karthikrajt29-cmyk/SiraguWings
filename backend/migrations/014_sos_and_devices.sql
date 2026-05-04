-- ============================================================================
-- MIGRATION 014: SOS events and per-device FCM tokens.
--
-- Why:
--   The mobile app introduces:
--     1. An SOS button (Parents + Teachers) that records emergency alerts.
--     2. Multi-device push — a single user may install the app on phone +
--        tablet, and both should receive every push. The legacy single
--        `user.device_token` column cannot represent this.
--
-- This migration:
--   - sos_event:    one row per SOS button press (with optional GPS).
--   - device_token: many rows per user; each row is one FCM token + platform.
--
-- The legacy `user.device_token` column is kept for backward compat — the
-- notification service falls back to it when no rows exist in device_token.
--
-- Idempotent — safe to re-run.
-- ============================================================================
SET search_path TO siraguwin, public;

BEGIN;

-- ─── sos_event ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.sos_event (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES siraguwin."user"(id),
    center_id       UUID         REFERENCES siraguwin.center(id),
    latitude        NUMERIC(10,7),
    longitude       NUMERIC(10,7),
    accuracy_meters NUMERIC(8,2),
    message         TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'Open'
                    CHECK (status IN ('Open','Acknowledged','Resolved','Cancelled')),
    acknowledged_by UUID         REFERENCES siraguwin."user"(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by     UUID         REFERENCES siraguwin."user"(id),
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,
    source_role     VARCHAR(20)  NOT NULL DEFAULT 'Parent'
                    CHECK (source_role IN ('Parent','Teacher','Staff','Owner')),
    -- audit
    created_by      UUID         REFERENCES siraguwin."user"(id),
    created_date    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_by     UUID         REFERENCES siraguwin."user"(id),
    modified_date   TIMESTAMPTZ,
    version_number  INT          NOT NULL DEFAULT 1,
    source_system   VARCHAR(40)  NOT NULL DEFAULT 'MobileApp',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_sos_event_user        ON siraguwin.sos_event (user_id, created_date DESC);
CREATE INDEX IF NOT EXISTS ix_sos_event_center      ON siraguwin.sos_event (center_id, created_date DESC) WHERE center_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_sos_event_open_status ON siraguwin.sos_event (status, created_date DESC) WHERE status = 'Open';


-- ─── device_token ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.device_token (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES siraguwin."user"(id),
    token         TEXT         NOT NULL,
    platform      VARCHAR(20)  NOT NULL DEFAULT 'Unknown'
                  CHECK (platform IN ('Android','iOS','Web','Unknown')),
    app_version   VARCHAR(40),
    last_seen_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- audit
    created_by    UUID         REFERENCES siraguwin."user"(id),
    created_date  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_by   UUID         REFERENCES siraguwin."user"(id),
    modified_date TIMESTAMPTZ,
    version_number INT         NOT NULL DEFAULT 1,
    source_system VARCHAR(40)  NOT NULL DEFAULT 'MobileApp',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE
);

-- A given FCM token belongs to exactly one user at a time. If the same token
-- shows up under a different user (e.g. account switch on the device), the
-- upsert in /me/devices will reassign it.
CREATE UNIQUE INDEX IF NOT EXISTS uq_device_token_token
    ON siraguwin.device_token (token)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS ix_device_token_user
    ON siraguwin.device_token (user_id)
    WHERE is_deleted = FALSE;


-- ─── teacher_activity (used by /teacher/activities) ─────────────────────────
-- Captures classroom updates a teacher posts (photo + caption). Parents see
-- these in their feed. Kept lightweight in v1 — single image as data URI,
-- no comments/reactions yet.
CREATE TABLE IF NOT EXISTS siraguwin.teacher_activity (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id     UUID         NOT NULL REFERENCES siraguwin."user"(id),
    center_id      UUID         NOT NULL REFERENCES siraguwin.center(id),
    batch_id       UUID         REFERENCES siraguwin.batch(id),
    title          VARCHAR(200) NOT NULL,
    body           TEXT,
    image_url      TEXT,
    activity_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
    -- audit
    created_by     UUID         REFERENCES siraguwin."user"(id),
    created_date   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_by    UUID         REFERENCES siraguwin."user"(id),
    modified_date  TIMESTAMPTZ,
    version_number INT          NOT NULL DEFAULT 1,
    source_system  VARCHAR(40)  NOT NULL DEFAULT 'MobileApp',
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted     BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_teacher_activity_center
    ON siraguwin.teacher_activity (center_id, activity_date DESC)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS ix_teacher_activity_batch
    ON siraguwin.teacher_activity (batch_id, activity_date DESC)
    WHERE is_deleted = FALSE AND batch_id IS NOT NULL;

COMMIT;
