-- ============================================================================
-- MIGRATION 005: Subscription & Storage Module
--
-- Adds:
--   • subscription_plan  — plan catalogue (Free / Basic / Standard / Premium)
--   • center_subscription — active plan per center
--   • usage_tracking     — live student count + storage used per center
--   • storage_add_on     — purchasable storage packs (1 GB / 5 GB / 10 GB)
--   • center_storage_purchase — purchased add-ons per center
--   • billing_history    — monthly invoice records
--
-- Idempotent — safe to re-run.
-- ============================================================================
SET search_path TO siraguwin, public;

BEGIN;

-- ─── 1. Subscription Plans ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.subscription_plan (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(50)  NOT NULL UNIQUE,   -- Free, Basic, Standard, Premium
    price               NUMERIC(10,2) NOT NULL DEFAULT 0,
    student_limit       INTEGER      NOT NULL,           -- max students included
    storage_limit_mb    INTEGER      NOT NULL,           -- storage included in MB
    extra_student_price NUMERIC(10,2) NOT NULL DEFAULT 0, -- per extra student
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order          INTEGER      NOT NULL DEFAULT 0,
    created_date        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_date       TIMESTAMPTZ
);

-- Seed plans (idempotent via ON CONFLICT)
INSERT INTO siraguwin.subscription_plan
    (name, price, student_limit, storage_limit_mb, extra_student_price, sort_order)
VALUES
    ('Free',     0,    10,   512,  0,  1),
    ('Basic',    500,  50,   1024, 20, 2),
    ('Standard', 1000, 110,  2048, 20, 3),
    ('Premium',  1500, 200,  3072, 20, 4)
ON CONFLICT (name) DO UPDATE SET
    price               = EXCLUDED.price,
    student_limit       = EXCLUDED.student_limit,
    storage_limit_mb    = EXCLUDED.storage_limit_mb,
    extra_student_price = EXCLUDED.extra_student_price,
    sort_order          = EXCLUDED.sort_order,
    modified_date       = NOW();

-- ─── 2. Center Subscription ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.center_subscription (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id    UUID         NOT NULL REFERENCES siraguwin.center(id),
    plan_id      UUID         NOT NULL REFERENCES siraguwin.subscription_plan(id),
    start_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    end_date     DATE,                                   -- NULL = open-ended / no expiry
    status       VARCHAR(20)  NOT NULL DEFAULT 'Active'  -- Active, Expired, Cancelled
                 CHECK (status IN ('Active','Expired','Cancelled')),
    assigned_by  UUID         REFERENCES siraguwin."user"(id),
    notes        TEXT,
    created_date TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_date TIMESTAMPTZ,
    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE
    -- partial unique index for "one active sub per center" added in step 7
);

-- Ensure every approved center gets a Free plan if they don't have one yet.
-- Uses a subquery filter instead of ON CONFLICT to avoid the partial-index
-- arbitration restriction.
INSERT INTO siraguwin.center_subscription (center_id, plan_id, status)
SELECT c.id,
       (SELECT id FROM siraguwin.subscription_plan WHERE name = 'Free' LIMIT 1),
       'Active'
FROM siraguwin.center c
WHERE c.is_deleted = FALSE
  AND c.registration_status = 'Approved'
  AND NOT EXISTS (
      SELECT 1 FROM siraguwin.center_subscription cs
      WHERE cs.center_id = c.id
        AND cs.status = 'Active'
        AND cs.is_deleted = FALSE
  );

-- ─── 3. Usage Tracking ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.usage_tracking (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id             UUID    NOT NULL UNIQUE REFERENCES siraguwin.center(id),
    current_student_count INTEGER NOT NULL DEFAULT 0,
    storage_used_mb       NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_updated          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Seed rows for existing centers
INSERT INTO siraguwin.usage_tracking (center_id, current_student_count, storage_used_mb)
SELECT c.id, 0, 0
FROM siraguwin.center c
WHERE c.is_deleted = FALSE
ON CONFLICT (center_id) DO NOTHING;

-- ─── 4. Storage Add-On Catalogue ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.storage_add_on (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(50)   NOT NULL UNIQUE,
    storage_mb   INTEGER       NOT NULL,
    price        NUMERIC(10,2) NOT NULL,
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    sort_order   INTEGER       NOT NULL DEFAULT 0,
    created_date TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

INSERT INTO siraguwin.storage_add_on (name, storage_mb, price, sort_order)
VALUES
    ('1 GB Pack',  1024, 100, 1),
    ('5 GB Pack',  5120, 400, 2),
    ('10 GB Pack', 10240, 700, 3)
ON CONFLICT (name) DO UPDATE SET
    storage_mb = EXCLUDED.storage_mb,
    price      = EXCLUDED.price,
    sort_order = EXCLUDED.sort_order;

-- ─── 5. Center Storage Purchases ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.center_storage_purchase (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id    UUID         NOT NULL REFERENCES siraguwin.center(id),
    add_on_id    UUID         NOT NULL REFERENCES siraguwin.storage_add_on(id),
    storage_mb   INTEGER      NOT NULL,
    price        NUMERIC(10,2) NOT NULL,
    start_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    end_date     DATE,
    status       VARCHAR(20)  NOT NULL DEFAULT 'Active'
                 CHECK (status IN ('Active','Expired','Cancelled')),
    purchased_by UUID         REFERENCES siraguwin."user"(id),
    created_date TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE
);

-- ─── 6. Billing History ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.billing_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id      UUID          NOT NULL REFERENCES siraguwin.center(id),
    billing_month  DATE          NOT NULL,               -- first day of month
    plan_name      VARCHAR(50)   NOT NULL,
    plan_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
    student_count  INTEGER       NOT NULL DEFAULT 0,
    extra_students INTEGER       NOT NULL DEFAULT 0,
    extra_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
    storage_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20)   NOT NULL DEFAULT 'Pending'
                   CHECK (payment_status IN ('Pending','Paid','Waived','Overdue')),
    notes          TEXT,
    created_date   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    modified_date  TIMESTAMPTZ,
    is_deleted     BOOLEAN       NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_billing_center_month UNIQUE (center_id, billing_month)
);

-- ─── 7. Indexes ─────────────────────────────────────────────────────────────

-- Only one active subscription per center at a time
CREATE UNIQUE INDEX IF NOT EXISTS uq_center_active_subscription
    ON siraguwin.center_subscription (center_id)
    WHERE status = 'Active' AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_center_subscription_center
    ON siraguwin.center_subscription (center_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_center_storage_purchase_center
    ON siraguwin.center_storage_purchase (center_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_billing_history_center
    ON siraguwin.billing_history (center_id, billing_month DESC) WHERE is_deleted = FALSE;

COMMIT;

-- ─── ROLLBACK (run manually if needed) ──────────────────────────────────────
-- DROP TABLE IF EXISTS siraguwin.billing_history;
-- DROP TABLE IF EXISTS siraguwin.center_storage_purchase;
-- DROP TABLE IF EXISTS siraguwin.storage_add_on;
-- DROP TABLE IF EXISTS siraguwin.usage_tracking;
-- DROP TABLE IF EXISTS siraguwin.center_subscription;
-- DROP TABLE IF EXISTS siraguwin.subscription_plan;
