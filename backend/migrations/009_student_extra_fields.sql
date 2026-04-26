-- Migration 009: Extra student profile fields
-- Adds blood group, current class, school name, address, emergency contact
-- and a base64/URL field update path for profile photos.

ALTER TABLE siraguwin.student
    ADD COLUMN IF NOT EXISTS blood_group        VARCHAR(5),
    ADD COLUMN IF NOT EXISTS current_class      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS school_name        VARCHAR(200),
    ADD COLUMN IF NOT EXISTS address            VARCHAR(500),
    ADD COLUMN IF NOT EXISTS emergency_contact  VARCHAR(20);

COMMENT ON COLUMN siraguwin.student.blood_group       IS 'e.g. A+, O-, AB+';
COMMENT ON COLUMN siraguwin.student.current_class     IS 'e.g. Class 5-A, LKG, Grade 10';
COMMENT ON COLUMN siraguwin.student.school_name       IS 'School the student currently attends';
COMMENT ON COLUMN siraguwin.student.address           IS 'Home address';
COMMENT ON COLUMN siraguwin.student.emergency_contact IS 'Emergency phone number';
