-- Migration 010: Add address and emergency_contact to the user table
-- These fields belong on the parent/guardian record, not the student.

ALTER TABLE siraguwin."user"
    ADD COLUMN IF NOT EXISTS address            VARCHAR(500),
    ADD COLUMN IF NOT EXISTS emergency_contact  VARCHAR(20);

COMMENT ON COLUMN siraguwin."user".address           IS 'Home / mailing address of the user (parent)';
COMMENT ON COLUMN siraguwin."user".emergency_contact IS 'Emergency contact phone number for the parent';
