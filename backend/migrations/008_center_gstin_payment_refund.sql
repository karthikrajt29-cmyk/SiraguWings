-- 008: GSTIN on center + Refunded payment status
-- Idempotent: re-running this is a no-op.

-- ─────────────────────────────────────────────────────────────────────
-- 1) center.gstin  (15-char GSTIN; nullable so existing rows are unaffected)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE siraguwin.center
    ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);

-- Light-weight format guard. Matches a standard 15-char Indian GSTIN.
-- Allow NULL (unset) explicitly.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_center_gstin_format'
    ) THEN
        ALTER TABLE siraguwin.center
            ADD CONSTRAINT ck_center_gstin_format
            CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$');
    END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────
-- 2) payment.status — allow 'Refunded'
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_payment_status'
    ) THEN
        ALTER TABLE siraguwin.payment
            DROP CONSTRAINT ck_payment_status;
    END IF;
    ALTER TABLE siraguwin.payment
        ADD CONSTRAINT ck_payment_status
        CHECK (status IN ('Success','Failed','Pending','Refunded'));
END $$;

-- Optional note column for refund reasons (re-uses existing schema where possible)
ALTER TABLE siraguwin.payment
    ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS refunded_at  TIMESTAMPTZ;
