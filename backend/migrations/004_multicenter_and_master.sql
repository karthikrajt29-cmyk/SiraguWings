-- ============================================================================
-- MIGRATION 004: Multi-center owner model + master data consolidation
--
-- Additive migration. Safely widens constraints, adds indexes, seeds dropdown
-- master data. Idempotent — can be re-run.
--
-- Related refactor:
--   • Adds 'Staff' to user_role allowed roles (already used in AddUserModal.tsx)
--   • Prevents duplicate (user, role, center) assignments
--   • Hardens center_teacher against duplicate links
--   • Seeds gender, class_days, class_level, subject master_data groups
--
-- Rollback (see bottom of file for commented rollback block).
-- ============================================================================
SET search_path TO siraguwin, public;

-- ─── 1. Pre-flight: abort if duplicate user_role rows exist ─────────────────
-- The unique index in step 3 will fail hard on duplicates; surface the issue
-- here with a clear message instead of a cryptic index-build error.
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count FROM (
        SELECT user_id, role,
               COALESCE(center_id, '00000000-0000-0000-0000-000000000000'::uuid) AS cid
        FROM siraguwin.user_role
        WHERE is_deleted = FALSE
        GROUP BY 1, 2, 3
        HAVING COUNT(*) > 1
    ) d;

    IF dup_count > 0 THEN
        RAISE EXCEPTION
            'Migration 004 aborted: % duplicate (user_id, role, center_id) rows found in user_role. '
            'Resolve these manually (soft-delete extras) before re-running. '
            'Query: SELECT user_id, role, center_id, COUNT(*) FROM siraguwin.user_role '
            'WHERE is_deleted=FALSE GROUP BY 1,2,3 HAVING COUNT(*) > 1;',
            dup_count;
    END IF;
END $$;

-- Same check for center_teacher (step 5 builds a unique index on it).
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count FROM (
        SELECT center_id, user_id
        FROM siraguwin.center_teacher
        WHERE is_deleted = FALSE
        GROUP BY 1, 2
        HAVING COUNT(*) > 1
    ) d;

    IF dup_count > 0 THEN
        RAISE EXCEPTION
            'Migration 004 aborted: % duplicate (center_id, user_id) rows found in center_teacher. '
            'Resolve these manually (soft-delete extras) before re-running. '
            'Query: SELECT center_id, user_id, COUNT(*) FROM siraguwin.center_teacher '
            'WHERE is_deleted=FALSE GROUP BY 1,2 HAVING COUNT(*) > 1;',
            dup_count;
    END IF;
END $$;

-- ─── 2. user_role: allow 'Staff' role ───────────────────────────────────────
ALTER TABLE siraguwin.user_role DROP CONSTRAINT IF EXISTS ck_user_role_role;
ALTER TABLE siraguwin.user_role ADD CONSTRAINT ck_user_role_role
    CHECK (role IN ('Owner','Teacher','Parent','Admin','Staff'));

-- ─── 3. user_role: prevent duplicate role assignments per (user, center) ───
-- Partial unique index — center_id may be NULL for global roles like Admin,
-- so COALESCE to a sentinel UUID so NULLs collapse to a single group.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_role_user_role_center
    ON siraguwin.user_role (
        user_id,
        role,
        COALESCE(center_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    WHERE is_deleted = FALSE;

-- ─── 4. user_role: add FK to center (schema v3 left this out with a TODO) ──
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_user_role_center' AND conrelid = 'siraguwin.user_role'::regclass
    ) THEN
        ALTER TABLE siraguwin.user_role ADD CONSTRAINT fk_user_role_center
            FOREIGN KEY (center_id) REFERENCES siraguwin.center(id);
    END IF;
END $$;

-- ─── 5. center_teacher: prevent same user linked twice to same center ──────
CREATE UNIQUE INDEX IF NOT EXISTS uq_center_teacher_center_user
    ON siraguwin.center_teacher (center_id, user_id)
    WHERE is_deleted = FALSE;

-- ============================================================================
-- 6. Seed master_data groups for dropdown-style fields
-- ============================================================================

-- ─── gender (mirrors student.gender CHECK; CHECK is kept as hard guard) ────
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
    ('gender', 'Male',   'Male',   1),
    ('gender', 'Female', 'Female', 2),
    ('gender', 'Other',  'Other',  3)
ON CONFLICT (group_name, value) DO NOTHING;

-- ─── class_days (replaces AddBatchModal.tsx DAYS_OPTIONS constant) ─────────
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
    ('class_days', 'Mon – Fri',     'Mon,Tue,Wed,Thu,Fri',         1),
    ('class_days', 'Mon, Wed, Fri', 'Mon,Wed,Fri',                 2),
    ('class_days', 'Tue, Thu, Sat', 'Tue,Thu,Sat',                 3),
    ('class_days', 'Sat & Sun',     'Sat,Sun',                     4),
    ('class_days', 'All Days',      'Mon,Tue,Wed,Thu,Fri,Sat,Sun', 5)
ON CONFLICT (group_name, value) DO NOTHING;

-- ─── class_level (Pre-KG through Grade 12) ──────────────────────────────────
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
    ('class_level', 'Pre-KG',  'PreKG',    1),
    ('class_level', 'LKG',     'LKG',      2),
    ('class_level', 'UKG',     'UKG',      3),
    ('class_level', 'Grade 1', 'Grade1',   4),
    ('class_level', 'Grade 2', 'Grade2',   5),
    ('class_level', 'Grade 3', 'Grade3',   6),
    ('class_level', 'Grade 4', 'Grade4',   7),
    ('class_level', 'Grade 5', 'Grade5',   8),
    ('class_level', 'Grade 6', 'Grade6',   9),
    ('class_level', 'Grade 7', 'Grade7',  10),
    ('class_level', 'Grade 8', 'Grade8',  11),
    ('class_level', 'Grade 9', 'Grade9',  12),
    ('class_level', 'Grade 10','Grade10', 13),
    ('class_level', 'Grade 11','Grade11', 14),
    ('class_level', 'Grade 12','Grade12', 15)
ON CONFLICT (group_name, value) DO NOTHING;

-- ─── subject (common Indian curriculum subjects) ───────────────────────────
INSERT INTO siraguwin.master_data (group_name, label, value, sort_order) VALUES
    ('subject', 'Mathematics',      'Mathematics',     1),
    ('subject', 'Science',          'Science',         2),
    ('subject', 'Physics',          'Physics',         3),
    ('subject', 'Chemistry',        'Chemistry',       4),
    ('subject', 'Biology',          'Biology',         5),
    ('subject', 'English',          'English',         6),
    ('subject', 'Tamil',            'Tamil',           7),
    ('subject', 'Hindi',            'Hindi',           8),
    ('subject', 'Social Studies',   'SocialStudies',   9),
    ('subject', 'Computer Science', 'ComputerScience',10),
    ('subject', 'General Knowledge','GeneralKnowledge',11)
ON CONFLICT (group_name, value) DO NOTHING;

-- ============================================================================
-- ROLLBACK (commented — run manually if this migration must be reverted)
-- ============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS siraguwin.uq_center_teacher_center_user;
-- DROP INDEX IF EXISTS siraguwin.uq_user_role_user_role_center;
-- ALTER TABLE siraguwin.user_role DROP CONSTRAINT IF EXISTS fk_user_role_center;
-- ALTER TABLE siraguwin.user_role DROP CONSTRAINT IF EXISTS ck_user_role_role;
-- ALTER TABLE siraguwin.user_role ADD CONSTRAINT ck_user_role_role
--     CHECK (role IN ('Owner','Teacher','Parent','Admin'));
-- DELETE FROM siraguwin.master_data
--     WHERE group_name IN ('gender','class_days','class_level','subject');
-- COMMIT;
