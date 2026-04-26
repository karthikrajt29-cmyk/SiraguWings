-- Migration 011: Extra teacher profile fields
-- Adds qualification and experience_years to center_teacher.

ALTER TABLE siraguwin.center_teacher
    ADD COLUMN IF NOT EXISTS qualification     VARCHAR(200),
    ADD COLUMN IF NOT EXISTS experience_years  SMALLINT;

COMMENT ON COLUMN siraguwin.center_teacher.qualification    IS 'e.g. B.Ed, M.Sc Mathematics, Diploma in Bharatanatyam';
COMMENT ON COLUMN siraguwin.center_teacher.experience_years IS 'Total years of relevant teaching experience';
