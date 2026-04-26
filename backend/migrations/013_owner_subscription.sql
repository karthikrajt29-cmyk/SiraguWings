-- ============================================================================
-- MIGRATION 013: Move subscriptions from Center level to Owner level.
--
-- Rationale: One Owner manages many Centers. The plan, storage add-ons, and
-- billing history must aggregate across all of an Owner's Centers.
--
-- This migration:
--   1. Creates owner_subscription, owner_storage_purchase, owner_billing_history
--      keyed by owner_id (references user.id, the user that owns one+ centers).
--   2. Migrates existing per-center rows by mapping center_id → center.owner_id.
--      For owners with multiple centers on different plans, we keep the highest
--      tier (subscription_plan.sort_order DESC).
--   3. Drops the old per-center tables.
--   4. Drops usage_tracking (now derived live from center_student joined to
--      all of an owner's centers — no separate cache).
--
-- Idempotent — safe to re-run.
-- ============================================================================
SET search_path TO siraguwin, public;

BEGIN;

-- ─── 1. owner_subscription ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.owner_subscription (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID         NOT NULL REFERENCES siraguwin."user"(id),
    plan_id       UUID         NOT NULL REFERENCES siraguwin.subscription_plan(id),
    start_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
    end_date      DATE,
    status        VARCHAR(20)  NOT NULL DEFAULT 'Active'
                  CHECK (status IN ('Active','Expired','Cancelled')),
    assigned_by   UUID         REFERENCES siraguwin."user"(id),
    notes         TEXT,
    created_date  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_date TIMESTAMPTZ,
    is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_active_subscription
    ON siraguwin.owner_subscription (owner_id)
    WHERE status = 'Active' AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_owner_subscription_owner
    ON siraguwin.owner_subscription (owner_id) WHERE is_deleted = FALSE;

-- ─── 2. owner_storage_purchase ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.owner_storage_purchase (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id     UUID          NOT NULL REFERENCES siraguwin."user"(id),
    add_on_id    UUID          NOT NULL REFERENCES siraguwin.storage_add_on(id),
    storage_mb   INTEGER       NOT NULL,
    price        NUMERIC(10,2) NOT NULL,
    start_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    end_date     DATE,
    status       VARCHAR(20)   NOT NULL DEFAULT 'Active'
                 CHECK (status IN ('Active','Expired','Cancelled')),
    purchased_by UUID          REFERENCES siraguwin."user"(id),
    created_date TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    is_deleted   BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_owner_storage_purchase_owner
    ON siraguwin.owner_storage_purchase (owner_id) WHERE is_deleted = FALSE;

-- ─── 3. owner_billing_history ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siraguwin.owner_billing_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id       UUID          NOT NULL REFERENCES siraguwin."user"(id),
    billing_month  DATE          NOT NULL,
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
    CONSTRAINT uq_owner_billing_month UNIQUE (owner_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_owner_billing_history_owner
    ON siraguwin.owner_billing_history (owner_id, billing_month DESC)
    WHERE is_deleted = FALSE;

-- ─── 4. Migrate existing data (only if old tables still exist) ──────────────
DO $$
BEGIN
    -- 4a. center_subscription → owner_subscription
    --     Pick the highest-tier plan per owner across their centers.
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'siraguwin' AND table_name = 'center_subscription') THEN

        INSERT INTO siraguwin.owner_subscription
            (owner_id, plan_id, start_date, end_date, status, assigned_by, notes, created_date)
        SELECT DISTINCT ON (c.owner_id)
               c.owner_id,
               cs.plan_id,
               cs.start_date,
               cs.end_date,
               'Active',
               cs.assigned_by,
               'Migrated from per-center subscription',
               cs.created_date
          FROM siraguwin.center_subscription cs
          JOIN siraguwin.center c           ON c.id  = cs.center_id AND c.is_deleted = FALSE
          JOIN siraguwin.subscription_plan sp ON sp.id = cs.plan_id
         WHERE cs.status = 'Active' AND cs.is_deleted = FALSE
           AND c.owner_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM siraguwin.owner_subscription os
                WHERE os.owner_id = c.owner_id
                  AND os.status = 'Active'
                  AND os.is_deleted = FALSE
           )
         ORDER BY c.owner_id, sp.sort_order DESC, cs.created_date DESC;
    END IF;

    -- 4b. Any owner of a center who still has no subscription → Free plan.
    INSERT INTO siraguwin.owner_subscription (owner_id, plan_id, status, notes)
    SELECT DISTINCT c.owner_id,
                    (SELECT id FROM siraguwin.subscription_plan WHERE name = 'Free' LIMIT 1),
                    'Active',
                    'Default Free plan on owner-level migration'
      FROM siraguwin.center c
     WHERE c.is_deleted = FALSE
       AND c.owner_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM siraguwin.owner_subscription os
            WHERE os.owner_id = c.owner_id
              AND os.status = 'Active'
              AND os.is_deleted = FALSE
       );

    -- 4c. center_storage_purchase → owner_storage_purchase
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'siraguwin' AND table_name = 'center_storage_purchase') THEN

        INSERT INTO siraguwin.owner_storage_purchase
            (owner_id, add_on_id, storage_mb, price, start_date, end_date, status,
             purchased_by, created_date)
        SELECT c.owner_id, csp.add_on_id, csp.storage_mb, csp.price,
               csp.start_date, csp.end_date, csp.status,
               csp.purchased_by, csp.created_date
          FROM siraguwin.center_storage_purchase csp
          JOIN siraguwin.center c ON c.id = csp.center_id AND c.is_deleted = FALSE
         WHERE csp.is_deleted = FALSE
           AND c.owner_id IS NOT NULL;
    END IF;

    -- 4d. billing_history → owner_billing_history (aggregated per owner+month).
    --     payment_status: prefer Pending/Overdue over Paid (conservative — if any
    --     center bill is unpaid, the owner-level bill stays unpaid).
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'siraguwin' AND table_name = 'billing_history') THEN

        INSERT INTO siraguwin.owner_billing_history
            (owner_id, billing_month, plan_name, plan_amount, student_count,
             extra_students, extra_amount, storage_amount, total_amount,
             payment_status, notes, created_date)
        SELECT c.owner_id,
               bh.billing_month,
               (SELECT plan_name FROM siraguwin.billing_history bh2
                JOIN siraguwin.center c2 ON c2.id = bh2.center_id
                WHERE c2.owner_id = c.owner_id AND bh2.billing_month = bh.billing_month
                  AND bh2.is_deleted = FALSE
                ORDER BY bh2.plan_amount DESC LIMIT 1) AS plan_name,
               SUM(bh.plan_amount),
               SUM(bh.student_count),
               SUM(bh.extra_students),
               SUM(bh.extra_amount),
               SUM(bh.storage_amount),
               SUM(bh.total_amount),
               CASE
                 WHEN BOOL_OR(bh.payment_status = 'Overdue') THEN 'Overdue'
                 WHEN BOOL_OR(bh.payment_status = 'Pending') THEN 'Pending'
                 WHEN BOOL_AND(bh.payment_status = 'Paid')   THEN 'Paid'
                 WHEN BOOL_AND(bh.payment_status = 'Waived') THEN 'Waived'
                 ELSE 'Pending'
               END,
               'Aggregated from per-center bills',
               MIN(bh.created_date)
          FROM siraguwin.billing_history bh
          JOIN siraguwin.center c ON c.id = bh.center_id AND c.is_deleted = FALSE
         WHERE bh.is_deleted = FALSE
           AND c.owner_id IS NOT NULL
         GROUP BY c.owner_id, bh.billing_month
        ON CONFLICT (owner_id, billing_month) DO NOTHING;
    END IF;
END $$;

-- ─── 5. Drop legacy per-center tables ───────────────────────────────────────
DROP TABLE IF EXISTS siraguwin.center_storage_purchase CASCADE;
DROP TABLE IF EXISTS siraguwin.billing_history          CASCADE;
DROP TABLE IF EXISTS siraguwin.center_subscription      CASCADE;
DROP TABLE IF EXISTS siraguwin.usage_tracking           CASCADE;

COMMIT;

-- ─── ROLLBACK (manual — destructive, do not auto-run) ───────────────────────
-- DROP TABLE IF EXISTS siraguwin.owner_billing_history;
-- DROP TABLE IF EXISTS siraguwin.owner_storage_purchase;
-- DROP TABLE IF EXISTS siraguwin.owner_subscription;
