-- Migration 006: Seed billing email configuration keys in app_config
-- These keys are read by the Settings → Email Config tab and the invoice send endpoint.

BEGIN;

DO $$
DECLARE
    v_admin_id UUID;
    v_keys     TEXT[] := ARRAY[
        'BillingEmailFrom', 'BillingEmailCC', 'BillingEmailBCC',
        'BillingDueDays', 'BillingReminderDays', 'BillingSendOnGenerate'
    ];
    v_values   TEXT[] := ARRAY['', '', '', '7', '3', 'false'];
    v_descs    TEXT[] := ARRAY[
        'Sender address for invoice emails',
        'Comma-separated CC list for invoice emails',
        'Comma-separated BCC list for invoice emails',
        'Days after bill generation that payment is due',
        'Days before due date to send payment reminder email',
        'Auto-send invoice email when bills are generated in bulk'
    ];
    i INT;
BEGIN
    -- Use the first admin user as the seed author (created_by is NOT NULL + FK to user)
    SELECT id INTO v_admin_id FROM siraguwin."user" LIMIT 1;

    FOR i IN 1..array_length(v_keys, 1) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM siraguwin.app_config WHERE config_key = v_keys[i]
        ) THEN
            INSERT INTO siraguwin.app_config
                (config_key, config_value, description, is_active, created_date, created_by)
            VALUES
                (v_keys[i], v_values[i], v_descs[i], TRUE, NOW() AT TIME ZONE 'UTC', v_admin_id);
        END IF;
    END LOOP;
END;
$$;

COMMIT;
