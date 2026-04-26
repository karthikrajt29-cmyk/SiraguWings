-- Migration 012: Proof document columns for center_teacher
-- Owner uploads a photo of the teacher's government ID and qualification certificate
-- directly from the portal; stored as base64 data URIs (TEXT).

ALTER TABLE siraguwin.center_teacher
    ADD COLUMN IF NOT EXISTS id_proof_url            TEXT,
    ADD COLUMN IF NOT EXISTS qualification_cert_url  TEXT;

COMMENT ON COLUMN siraguwin.center_teacher.id_proof_url           IS 'Photo of government-issued ID (Aadhaar / PAN / Passport)';
COMMENT ON COLUMN siraguwin.center_teacher.qualification_cert_url IS 'Photo of highest qualification or relevant certificate';
