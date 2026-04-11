-- ============================================================================
-- SIRAGUWIN — PostgreSQL Database Schema
-- Version: 3.0 (Pilot — Chennai)
-- Generated: 2026-03-28
-- ============================================================================

-- ============================================================================
-- SECTION 1: ASSUMPTIONS
-- ============================================================================
/*
  ASSUMPTIONS & DESIGN DECISIONS
  ─────────────────────────────────────────────────────────────────────────────
  1. DATA TYPE MAPPINGS (SQL Server → PostgreSQL):
     - UNIQUEIDENTIFIER        → UUID
     - NVARCHAR(n)             → VARCHAR(n)
     - NVARCHAR(MAX)           → TEXT
     - DATETIME2(7)            → TIMESTAMPTZ  (UTC timestamps with timezone)
     - BIT                     → BOOLEAN
     - VARBINARY(32)           → BYTEA
     - DECIMAL(p,s)            → NUMERIC(p,s)
     - INT                     → INTEGER
     - BIGINT                  → BIGINT
     - DATE                    → DATE
     - TIME                    → TIME

  2. NAMING CONVENTION:
     - All table and column names converted to snake_case for PostgreSQL best
       practice (e.g., UserRole → user_role, MobileNumber → mobile_number).
     - Constraint names follow: pk_<table>, fk_<table>_<column>,
       uq_<table>_<column>, ck_<table>_<column>, idx_<table>_<column>.

  3. DEFAULT VALUES:
     - NEWID()       → gen_random_uuid()
     - GETUTCDATE()  → NOW() AT TIME ZONE 'UTC'  (returns UTC timestamptz)
     - String defaults like 'Active' kept as-is.

  4. SELF-REFERENCING FKs ON "user" TABLE:
     - The Excel schema marks created_by / modified_by as FK → User.Id on every
       table including "user" itself. To avoid circular dependency issues during
       INSERT, these self-referencing FKs on the "user" table (created_by,
       modified_by) are declared as DEFERRABLE INITIALLY DEFERRED.

  5. SCHEMA NAMESPACE:
     - All objects are created under the "siraguwin" schema to keep them isolated.

  6. INDEXES:
     - Every column marked "Is Indexed = Yes" in the Excel gets a B-tree index.
     - Composite indexes added where the workflow implies frequent multi-column
       lookups (e.g., attendance by batch+student+date).

  7. UNIQUE CONSTRAINTS:
     - Attendance: composite UNIQUE on (batch_id, student_id, attendance_date).
     - CenterStudent: composite UNIQUE on (center_id, student_id) to prevent
       double-enrollment at the same center.

  8. FOREIGN KEY ON merge_log.student_merged_id:
     - The Excel marks this as NOT an FK because the merged student record may
       be deleted. We keep it as a plain column (no FK constraint) per design.

  9. SAMPLE DATA:
     - Uses realistic Indian names, Chennai addresses, and INR amounts.
     - Fixed UUIDs used so FK relationships can be followed easily.
     - All timestamps are in UTC.
*/

-- ============================================================================
-- SECTION 2: DDL — CREATE SCHEMA & TABLES
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEAN START: Drop all tables in reverse dependency order, then recreate schema
-- ─────────────────────────────────────────────────────────────────────────────
SET client_min_messages TO WARNING;  -- suppress NOTICE noise during drops

DROP TABLE IF EXISTS siraguwin.app_config        CASCADE;
DROP TABLE IF EXISTS siraguwin.audit_log         CASCADE;
DROP TABLE IF EXISTS siraguwin.notification_log  CASCADE;
DROP TABLE IF EXISTS siraguwin.merge_log         CASCADE;
DROP TABLE IF EXISTS siraguwin.platform_payment  CASCADE;
DROP TABLE IF EXISTS siraguwin.platform_invoice  CASCADE;
DROP TABLE IF EXISTS siraguwin.payment           CASCADE;
DROP TABLE IF EXISTS siraguwin.fee               CASCADE;
DROP TABLE IF EXISTS siraguwin.message           CASCADE;
DROP TABLE IF EXISTS siraguwin.announcement      CASCADE;
DROP TABLE IF EXISTS siraguwin.material          CASCADE;
DROP TABLE IF EXISTS siraguwin.attendance        CASCADE;
DROP TABLE IF EXISTS siraguwin.batch_student     CASCADE;
DROP TABLE IF EXISTS siraguwin.batch             CASCADE;
DROP TABLE IF EXISTS siraguwin.center_teacher    CASCADE;
DROP TABLE IF EXISTS siraguwin.student_invite    CASCADE;
DROP TABLE IF EXISTS siraguwin.center_student    CASCADE;
DROP TABLE IF EXISTS siraguwin.student           CASCADE;
DROP TABLE IF EXISTS siraguwin.otp_log           CASCADE;
DROP TABLE IF EXISTS siraguwin.user_role         CASCADE;
DROP TABLE IF EXISTS siraguwin.center            CASCADE;
DROP TABLE IF EXISTS siraguwin."user"            CASCADE;

-- Drop and recreate schema to guarantee a pristine state
DROP SCHEMA IF EXISTS siraguwin CASCADE;
CREATE SCHEMA siraguwin;
SET search_path TO siraguwin, public;

RESET client_min_messages;

-- Enable UUID generation (idempotent — safe to re-run)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USER  (base account for all roles)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin."user" (
    id                    UUID         NOT NULL DEFAULT gen_random_uuid(),
    mobile_number         VARCHAR(15)  NOT NULL,
    name                  VARCHAR(200) NOT NULL,
    email                 VARCHAR(255),
    profile_image_url     VARCHAR(500),
    status                VARCHAR(20)  NOT NULL DEFAULT 'Active',
    last_login_at         TIMESTAMPTZ,
    failed_login_attempts INTEGER      NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    preferred_language    VARCHAR(10)  NOT NULL DEFAULT 'en',
    device_token          VARCHAR(500),
    device_platform       VARCHAR(20),
    -- audit / system columns
    created_by            UUID         NOT NULL,
    created_date          TIMESTAMPTZ  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by           UUID,
    modified_date         TIMESTAMPTZ,
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted            BOOLEAN      NOT NULL DEFAULT FALSE,
    version_number        INTEGER      NOT NULL DEFAULT 1,
    row_hash              BYTEA,
    source_system         VARCHAR(50)  NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_user                PRIMARY KEY (id),
    CONSTRAINT uq_user_mobile_number  UNIQUE (mobile_number),
    CONSTRAINT ck_user_status         CHECK (status IN ('Active','Suspended','Locked')),
    CONSTRAINT ck_user_device_platform CHECK (device_platform IS NULL OR device_platform IN ('Android','iOS','Web')),
    CONSTRAINT fk_user_created_by     FOREIGN KEY (created_by)  REFERENCES siraguwin."user"(id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_user_modified_by    FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_user_status       ON siraguwin."user" (status);
CREATE INDEX idx_user_created_date ON siraguwin."user" (created_date);
CREATE INDEX idx_user_is_active    ON siraguwin."user" (is_active);
CREATE INDEX idx_user_is_deleted   ON siraguwin."user" (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. USER_ROLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.user_role (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    role            VARCHAR(20)  NOT NULL,
    center_id       UUID,
    assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    -- audit
    created_by      UUID         NOT NULL,
    created_date    TIMESTAMPTZ  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
    version_number  INTEGER      NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)  NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_user_role           PRIMARY KEY (id),
    CONSTRAINT ck_user_role_role      CHECK (role IN ('Owner','Teacher','Parent','Admin')),
    CONSTRAINT fk_user_role_user      FOREIGN KEY (user_id)    REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_user_role_created   FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_user_role_modified  FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
    -- center_id FK added after center table exists
);

CREATE INDEX idx_user_role_user_id      ON siraguwin.user_role (user_id);
CREATE INDEX idx_user_role_role         ON siraguwin.user_role (role);
CREATE INDEX idx_user_role_center_id    ON siraguwin.user_role (center_id);
CREATE INDEX idx_user_role_created_date ON siraguwin.user_role (created_date);
CREATE INDEX idx_user_role_is_active    ON siraguwin.user_role (is_active);
CREATE INDEX idx_user_role_is_deleted   ON siraguwin.user_role (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. OTP_LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.otp_log (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    mobile_number   VARCHAR(15)   NOT NULL,
    otp_hash        VARCHAR(128)  NOT NULL,
    purpose         VARCHAR(30)   NOT NULL DEFAULT 'Login',
    status          VARCHAR(20)   NOT NULL DEFAULT 'Sent',
    sent_at         TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    expires_at      TIMESTAMPTZ   NOT NULL,
    verified_at     TIMESTAMPTZ,
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_otp_log             PRIMARY KEY (id),
    CONSTRAINT ck_otp_log_purpose     CHECK (purpose IN ('Login','Registration','Verification')),
    CONSTRAINT ck_otp_log_status      CHECK (status IN ('Sent','Verified','Expired','Failed')),
    CONSTRAINT fk_otp_log_created     FOREIGN KEY (created_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_otp_log_modified    FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_otp_log_mobile     ON siraguwin.otp_log (mobile_number);
CREATE INDEX idx_otp_log_status     ON siraguwin.otp_log (status);
CREATE INDEX idx_otp_log_created    ON siraguwin.otp_log (created_date);
CREATE INDEX idx_otp_log_is_active  ON siraguwin.otp_log (is_active);
CREATE INDEX idx_otp_log_is_deleted ON siraguwin.otp_log (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CENTER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.center (
    id                     UUID           NOT NULL DEFAULT gen_random_uuid(),
    owner_id               UUID           NOT NULL,
    name                   VARCHAR(300)   NOT NULL,
    category               VARCHAR(50)    NOT NULL,
    owner_name             VARCHAR(200)   NOT NULL,
    mobile_number          VARCHAR(15)    NOT NULL,
    address                VARCHAR(500)   NOT NULL,
    city                   VARCHAR(100)   NOT NULL DEFAULT 'Chennai',
    latitude               NUMERIC(10,7),
    longitude              NUMERIC(10,7),
    operating_days         VARCHAR(100)   NOT NULL,
    operating_timings      VARCHAR(100)   NOT NULL,
    age_group              VARCHAR(100)   NOT NULL,
    description            VARCHAR(2000)  NOT NULL,
    logo_url               VARCHAR(500)   NOT NULL,
    cover_image_url        VARCHAR(500),
    fee_range              VARCHAR(100),
    facilities             VARCHAR(1000),
    social_link            VARCHAR(500),
    website_link           VARCHAR(500),
    registration_status    VARCHAR(20)    NOT NULL DEFAULT 'Draft',
    rejection_reason       VARCHAR(500),
    rejection_category     VARCHAR(50),
    admin_notes            VARCHAR(2000),
    subscription_status    VARCHAR(20)    NOT NULL DEFAULT 'Trial',
    registration_cert_url  VARCHAR(500),
    premises_proof_url     VARCHAR(500),
    owner_id_proof_url     VARCHAR(500),
    safety_cert_url        VARCHAR(500),
    approved_at            TIMESTAMPTZ,
    trial_ends_at          TIMESTAMPTZ,
    suspended_at           TIMESTAMPTZ,
    data_purge_at          TIMESTAMPTZ,
    -- audit
    created_by             UUID           NOT NULL,
    created_date           TIMESTAMPTZ    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by            UUID,
    modified_date          TIMESTAMPTZ,
    is_active              BOOLEAN        NOT NULL DEFAULT TRUE,
    is_deleted             BOOLEAN        NOT NULL DEFAULT FALSE,
    version_number         INTEGER        NOT NULL DEFAULT 1,
    row_hash               BYTEA,
    source_system          VARCHAR(50)    NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_center                    PRIMARY KEY (id),
    CONSTRAINT ck_center_category           CHECK (category IN ('Tuition','Daycare','KidsSchool','PlaySchool','Dance','Music','ArtPainting','Abacus','SpokenEnglish','YogaActivity')),
    CONSTRAINT ck_center_description_len    CHECK (LENGTH(description) >= 50),
    CONSTRAINT ck_center_reg_status         CHECK (registration_status IN ('Draft','Submitted','UnderReview','Approved','Rejected','Suspended')),
    CONSTRAINT ck_center_rejection_cat      CHECK (rejection_category IS NULL OR rejection_category IN ('IncompleteInfo','UnverifiableLocation','Duplicate','MissingDocs','CategoryMismatch','Other')),
    CONSTRAINT ck_center_subscription       CHECK (subscription_status IN ('Trial','Active','Grace','Restricted','Suspended')),
    CONSTRAINT fk_center_owner              FOREIGN KEY (owner_id)    REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_center_created            FOREIGN KEY (created_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_center_modified           FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_center_owner_id     ON siraguwin.center (owner_id);
CREATE INDEX idx_center_category     ON siraguwin.center (category);
CREATE INDEX idx_center_city         ON siraguwin.center (city);
CREATE INDEX idx_center_reg_status   ON siraguwin.center (registration_status);
CREATE INDEX idx_center_sub_status   ON siraguwin.center (subscription_status);
CREATE INDEX idx_center_created_date ON siraguwin.center (created_date);
CREATE INDEX idx_center_is_active    ON siraguwin.center (is_active);
CREATE INDEX idx_center_is_deleted   ON siraguwin.center (is_deleted);

-- Now add deferred FK on user_role.center_id
ALTER TABLE siraguwin.user_role
    ADD CONSTRAINT fk_user_role_center FOREIGN KEY (center_id) REFERENCES siraguwin.center(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. STUDENT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.student (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    parent_id         UUID,
    name              VARCHAR(200)  NOT NULL,
    date_of_birth     DATE          NOT NULL,
    gender            VARCHAR(10)   NOT NULL,
    medical_notes     VARCHAR(2000),
    profile_image_url VARCHAR(500),
    created_by_path   VARCHAR(10)   NOT NULL,
    -- audit
    created_by        UUID          NOT NULL,
    created_date      TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by       UUID,
    modified_date     TIMESTAMPTZ,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number    INTEGER       NOT NULL DEFAULT 1,
    row_hash          BYTEA,
    source_system     VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_student               PRIMARY KEY (id),
    CONSTRAINT ck_student_gender        CHECK (gender IN ('Male','Female','Other')),
    CONSTRAINT ck_student_created_path  CHECK (created_by_path IN ('Center','Parent')),
    CONSTRAINT fk_student_parent        FOREIGN KEY (parent_id)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_student_created       FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_student_modified      FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_student_parent_id   ON siraguwin.student (parent_id);
CREATE INDEX idx_student_dob         ON siraguwin.student (date_of_birth);
CREATE INDEX idx_student_created     ON siraguwin.student (created_date);
CREATE INDEX idx_student_is_active   ON siraguwin.student (is_active);
CREATE INDEX idx_student_is_deleted  ON siraguwin.student (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. CENTER_STUDENT  (billing link table)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.center_student (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    center_id       UUID          NOT NULL,
    student_id      UUID          NOT NULL,
    invite_status   VARCHAR(20)   NOT NULL DEFAULT 'Sent',
    invite_link     VARCHAR(500),
    status          VARCHAR(20)   NOT NULL DEFAULT 'Active',
    added_at        TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    linked_at       TIMESTAMPTZ,
    removed_at      TIMESTAMPTZ,
    removed_reason  VARCHAR(500),
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_center_student              PRIMARY KEY (id),
    CONSTRAINT uq_center_student_link         UNIQUE (center_id, student_id),
    CONSTRAINT uq_center_student_invite_link  UNIQUE (invite_link),
    CONSTRAINT ck_cs_invite_status            CHECK (invite_status IN ('Sent','Opened','Accepted','Expired','Linked')),
    CONSTRAINT ck_cs_status                   CHECK (status IN ('Active','Removed')),
    CONSTRAINT fk_cs_center                   FOREIGN KEY (center_id)  REFERENCES siraguwin.center(id),
    CONSTRAINT fk_cs_student                  FOREIGN KEY (student_id) REFERENCES siraguwin.student(id),
    CONSTRAINT fk_cs_created                  FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_cs_modified                 FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_cs_center_id     ON siraguwin.center_student (center_id);
CREATE INDEX idx_cs_student_id    ON siraguwin.center_student (student_id);
CREATE INDEX idx_cs_invite_status ON siraguwin.center_student (invite_status);
CREATE INDEX idx_cs_status        ON siraguwin.center_student (status);
CREATE INDEX idx_cs_added_at      ON siraguwin.center_student (added_at);
CREATE INDEX idx_cs_created_date  ON siraguwin.center_student (created_date);
CREATE INDEX idx_cs_is_active     ON siraguwin.center_student (is_active);
CREATE INDEX idx_cs_is_deleted    ON siraguwin.center_student (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. STUDENT_INVITE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.student_invite (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    center_student_id  UUID          NOT NULL,
    link_token         VARCHAR(200)  NOT NULL,
    status             VARCHAR(20)   NOT NULL DEFAULT 'Sent',
    channel            VARCHAR(20)   NOT NULL DEFAULT 'SMS',
    sent_at            TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    expires_at         TIMESTAMPTZ   NOT NULL,
    opened_at          TIMESTAMPTZ,
    accepted_at        TIMESTAMPTZ,
    attempt_count      INTEGER       NOT NULL DEFAULT 1,
    -- audit
    created_by         UUID          NOT NULL,
    created_date       TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by        UUID,
    modified_date      TIMESTAMPTZ,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted         BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number     INTEGER       NOT NULL DEFAULT 1,
    row_hash           BYTEA,
    source_system      VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_student_invite          PRIMARY KEY (id),
    CONSTRAINT uq_student_invite_token    UNIQUE (link_token),
    CONSTRAINT ck_si_status               CHECK (status IN ('Sent','Opened','Accepted','Expired')),
    CONSTRAINT ck_si_channel              CHECK (channel IN ('SMS','WhatsApp')),
    CONSTRAINT fk_si_center_student       FOREIGN KEY (center_student_id) REFERENCES siraguwin.center_student(id),
    CONSTRAINT fk_si_created              FOREIGN KEY (created_by)        REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_si_modified             FOREIGN KEY (modified_by)       REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_si_cs_id          ON siraguwin.student_invite (center_student_id);
CREATE INDEX idx_si_token          ON siraguwin.student_invite (link_token);
CREATE INDEX idx_si_status         ON siraguwin.student_invite (status);
CREATE INDEX idx_si_created_date   ON siraguwin.student_invite (created_date);
CREATE INDEX idx_si_is_active      ON siraguwin.student_invite (is_active);
CREATE INDEX idx_si_is_deleted     ON siraguwin.student_invite (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. CENTER_TEACHER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.center_teacher (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    center_id       UUID          NOT NULL,
    user_id         UUID          NOT NULL,
    specialisation  VARCHAR(200),
    joined_at       TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    deactivated_at  TIMESTAMPTZ,
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_center_teacher          PRIMARY KEY (id),
    CONSTRAINT fk_ct_center               FOREIGN KEY (center_id)  REFERENCES siraguwin.center(id),
    CONSTRAINT fk_ct_user                 FOREIGN KEY (user_id)    REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ct_created              FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ct_modified             FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_ct_center_id     ON siraguwin.center_teacher (center_id);
CREATE INDEX idx_ct_user_id       ON siraguwin.center_teacher (user_id);
CREATE INDEX idx_ct_created_date  ON siraguwin.center_teacher (created_date);
CREATE INDEX idx_ct_is_active     ON siraguwin.center_teacher (is_active);
CREATE INDEX idx_ct_is_deleted    ON siraguwin.center_teacher (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. BATCH
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.batch (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    center_id       UUID          NOT NULL,
    teacher_id      UUID,
    course_name     VARCHAR(200)  NOT NULL,
    batch_name      VARCHAR(200)  NOT NULL,
    category_type   VARCHAR(50),
    class_days      VARCHAR(100)  NOT NULL,
    start_time      TIME          NOT NULL,
    end_time        TIME          NOT NULL,
    strength_limit  INTEGER,
    fee_amount      NUMERIC(10,2) NOT NULL,
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_batch             PRIMARY KEY (id),
    CONSTRAINT fk_batch_center      FOREIGN KEY (center_id)  REFERENCES siraguwin.center(id),
    CONSTRAINT fk_batch_teacher     FOREIGN KEY (teacher_id) REFERENCES siraguwin.center_teacher(id),
    CONSTRAINT fk_batch_created     FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_batch_modified    FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_batch_center_id    ON siraguwin.batch (center_id);
CREATE INDEX idx_batch_teacher_id   ON siraguwin.batch (teacher_id);
CREATE INDEX idx_batch_created_date ON siraguwin.batch (created_date);
CREATE INDEX idx_batch_is_active    ON siraguwin.batch (is_active);
CREATE INDEX idx_batch_is_deleted   ON siraguwin.batch (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. BATCH_STUDENT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.batch_student (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    batch_id        UUID         NOT NULL,
    student_id      UUID         NOT NULL,
    assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    removed_at      TIMESTAMPTZ,
    -- audit
    created_by      UUID         NOT NULL,
    created_date    TIMESTAMPTZ  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
    version_number  INTEGER      NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)  NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_batch_student          PRIMARY KEY (id),
    CONSTRAINT fk_bs_batch               FOREIGN KEY (batch_id)   REFERENCES siraguwin.batch(id),
    CONSTRAINT fk_bs_student             FOREIGN KEY (student_id) REFERENCES siraguwin.student(id),
    CONSTRAINT fk_bs_created             FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_bs_modified            FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_bs_batch_id      ON siraguwin.batch_student (batch_id);
CREATE INDEX idx_bs_student_id    ON siraguwin.batch_student (student_id);
CREATE INDEX idx_bs_created_date  ON siraguwin.batch_student (created_date);
CREATE INDEX idx_bs_is_active     ON siraguwin.batch_student (is_active);
CREATE INDEX idx_bs_is_deleted    ON siraguwin.batch_student (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ATTENDANCE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.attendance (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    batch_id         UUID         NOT NULL,
    student_id       UUID         NOT NULL,
    marked_by        UUID         NOT NULL,
    attendance_date  DATE         NOT NULL,
    status           VARCHAR(10)  NOT NULL,
    marked_at        TIMESTAMPTZ  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    edited_at        TIMESTAMPTZ,
    edited_by        UUID,
    previous_status  VARCHAR(10),
    -- audit
    created_by       UUID         NOT NULL,
    created_date     TIMESTAMPTZ  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by      UUID,
    modified_date    TIMESTAMPTZ,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    version_number   INTEGER      NOT NULL DEFAULT 1,
    row_hash         BYTEA,
    source_system    VARCHAR(50)  NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_attendance             PRIMARY KEY (id),
    CONSTRAINT uq_attendance_unique      UNIQUE (batch_id, student_id, attendance_date),
    CONSTRAINT ck_attendance_status      CHECK (status IN ('Present','Absent')),
    CONSTRAINT fk_att_batch              FOREIGN KEY (batch_id)   REFERENCES siraguwin.batch(id),
    CONSTRAINT fk_att_student            FOREIGN KEY (student_id) REFERENCES siraguwin.student(id),
    CONSTRAINT fk_att_marked_by          FOREIGN KEY (marked_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_att_edited_by          FOREIGN KEY (edited_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_att_created            FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_att_modified           FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_att_batch_id   ON siraguwin.attendance (batch_id);
CREATE INDEX idx_att_student_id ON siraguwin.attendance (student_id);
CREATE INDEX idx_att_marked_by  ON siraguwin.attendance (marked_by);
CREATE INDEX idx_att_date       ON siraguwin.attendance (attendance_date);
CREATE INDEX idx_att_created    ON siraguwin.attendance (created_date);
CREATE INDEX idx_att_is_active  ON siraguwin.attendance (is_active);
CREATE INDEX idx_att_is_deleted ON siraguwin.attendance (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. MATERIAL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.material (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    batch_id        UUID          NOT NULL,
    uploaded_by     UUID          NOT NULL,
    center_id       UUID          NOT NULL,
    title           VARCHAR(300)  NOT NULL,
    description     VARCHAR(2000),
    type            VARCHAR(20)   NOT NULL,
    file_url        VARCHAR(500),
    file_size_bytes BIGINT,
    visibility      VARCHAR(20)   NOT NULL DEFAULT 'Published',
    publish_date    TIMESTAMPTZ,
    reviewed_by     UUID,
    reviewed_at     TIMESTAMPTZ,
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_material              PRIMARY KEY (id),
    CONSTRAINT ck_material_type         CHECK (type IN ('PDF','Image','VideoLink','TextNote')),
    CONSTRAINT ck_material_visibility   CHECK (visibility IN ('Published','PendingReview','Scheduled')),
    CONSTRAINT fk_mat_batch             FOREIGN KEY (batch_id)    REFERENCES siraguwin.batch(id),
    CONSTRAINT fk_mat_uploaded_by       FOREIGN KEY (uploaded_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_mat_center            FOREIGN KEY (center_id)   REFERENCES siraguwin.center(id),
    CONSTRAINT fk_mat_reviewed_by       FOREIGN KEY (reviewed_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_mat_created           FOREIGN KEY (created_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_mat_modified          FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_mat_batch_id      ON siraguwin.material (batch_id);
CREATE INDEX idx_mat_uploaded_by   ON siraguwin.material (uploaded_by);
CREATE INDEX idx_mat_center_id     ON siraguwin.material (center_id);
CREATE INDEX idx_mat_type          ON siraguwin.material (type);
CREATE INDEX idx_mat_visibility    ON siraguwin.material (visibility);
CREATE INDEX idx_mat_created_date  ON siraguwin.material (created_date);
CREATE INDEX idx_mat_is_active     ON siraguwin.material (is_active);
CREATE INDEX idx_mat_is_deleted    ON siraguwin.material (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. ANNOUNCEMENT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.announcement (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    center_id       UUID          NOT NULL,
    batch_id        UUID,
    authored_by     UUID          NOT NULL,
    title           VARCHAR(300)  NOT NULL,
    message_body    TEXT          NOT NULL,
    attachment_url  VARCHAR(500),
    target          VARCHAR(20)   NOT NULL,
    publish_at      TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    is_published    BOOLEAN       NOT NULL DEFAULT FALSE,
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_announcement           PRIMARY KEY (id),
    CONSTRAINT ck_ann_target             CHECK (target IN ('Batch','AllParents')),
    CONSTRAINT fk_ann_center             FOREIGN KEY (center_id)   REFERENCES siraguwin.center(id),
    CONSTRAINT fk_ann_batch              FOREIGN KEY (batch_id)    REFERENCES siraguwin.batch(id),
    CONSTRAINT fk_ann_authored_by        FOREIGN KEY (authored_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ann_created            FOREIGN KEY (created_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ann_modified           FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_ann_center_id     ON siraguwin.announcement (center_id);
CREATE INDEX idx_ann_batch_id      ON siraguwin.announcement (batch_id);
CREATE INDEX idx_ann_authored_by   ON siraguwin.announcement (authored_by);
CREATE INDEX idx_ann_publish_at    ON siraguwin.announcement (publish_at);
CREATE INDEX idx_ann_created_date  ON siraguwin.announcement (created_date);
CREATE INDEX idx_ann_is_active     ON siraguwin.announcement (is_active);
CREATE INDEX idx_ann_is_deleted    ON siraguwin.announcement (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. MESSAGE  (direct messaging with self-referencing thread)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.message (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    center_id       UUID          NOT NULL,
    sender_id       UUID          NOT NULL,
    recipient_id    UUID          NOT NULL,
    thread_id       UUID,
    topic_tag       VARCHAR(20)   NOT NULL DEFAULT 'General',
    body            TEXT          NOT NULL,
    attachment_url  VARCHAR(500),
    is_read         BOOLEAN       NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    read_at         TIMESTAMPTZ,
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_message              PRIMARY KEY (id),
    CONSTRAINT ck_msg_topic_tag        CHECK (topic_tag IN ('Homework','Fee','Schedule','General','Media')),
    CONSTRAINT fk_msg_center           FOREIGN KEY (center_id)    REFERENCES siraguwin.center(id),
    CONSTRAINT fk_msg_sender           FOREIGN KEY (sender_id)    REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_msg_recipient        FOREIGN KEY (recipient_id) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_msg_thread           FOREIGN KEY (thread_id)    REFERENCES siraguwin.message(id),
    CONSTRAINT fk_msg_created          FOREIGN KEY (created_by)   REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_msg_modified         FOREIGN KEY (modified_by)  REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_msg_center_id      ON siraguwin.message (center_id);
CREATE INDEX idx_msg_sender_id      ON siraguwin.message (sender_id);
CREATE INDEX idx_msg_recipient_id   ON siraguwin.message (recipient_id);
CREATE INDEX idx_msg_thread_id      ON siraguwin.message (thread_id);
CREATE INDEX idx_msg_topic_tag      ON siraguwin.message (topic_tag);
CREATE INDEX idx_msg_sent_at        ON siraguwin.message (sent_at);
CREATE INDEX idx_msg_is_read        ON siraguwin.message (is_read);
CREATE INDEX idx_msg_created_date   ON siraguwin.message (created_date);
CREATE INDEX idx_msg_is_active      ON siraguwin.message (is_active);
CREATE INDEX idx_msg_is_deleted     ON siraguwin.message (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. FEE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.fee (
    id                       UUID          NOT NULL DEFAULT gen_random_uuid(),
    center_id                UUID          NOT NULL,
    student_id               UUID          NOT NULL,
    batch_id                 UUID,
    amount                   NUMERIC(10,2) NOT NULL,
    due_date                 DATE          NOT NULL,
    status                   VARCHAR(20)   NOT NULL DEFAULT 'Pending',
    notes                    VARCHAR(500),
    reminder_sent_at         TIMESTAMPTZ,
    reminder_count           INTEGER       NOT NULL DEFAULT 0,
    whatsapp_link_generated  BOOLEAN       NOT NULL DEFAULT FALSE,
    -- audit
    created_by               UUID          NOT NULL,
    created_date             TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by              UUID,
    modified_date            TIMESTAMPTZ,
    is_active                BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted               BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number           INTEGER       NOT NULL DEFAULT 1,
    row_hash                 BYTEA,
    source_system            VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_fee                PRIMARY KEY (id),
    CONSTRAINT ck_fee_status         CHECK (status IN ('Pending','Paid','Overdue','PartiallyPaid')),
    CONSTRAINT fk_fee_center         FOREIGN KEY (center_id)  REFERENCES siraguwin.center(id),
    CONSTRAINT fk_fee_student        FOREIGN KEY (student_id) REFERENCES siraguwin.student(id),
    CONSTRAINT fk_fee_batch          FOREIGN KEY (batch_id)   REFERENCES siraguwin.batch(id),
    CONSTRAINT fk_fee_created        FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_fee_modified       FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_fee_center_id    ON siraguwin.fee (center_id);
CREATE INDEX idx_fee_student_id   ON siraguwin.fee (student_id);
CREATE INDEX idx_fee_batch_id     ON siraguwin.fee (batch_id);
CREATE INDEX idx_fee_due_date     ON siraguwin.fee (due_date);
CREATE INDEX idx_fee_status       ON siraguwin.fee (status);
CREATE INDEX idx_fee_created_date ON siraguwin.fee (created_date);
CREATE INDEX idx_fee_is_active    ON siraguwin.fee (is_active);
CREATE INDEX idx_fee_is_deleted   ON siraguwin.fee (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. PAYMENT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.payment (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    fee_id             UUID          NOT NULL,
    mode               VARCHAR(20)   NOT NULL,
    status             VARCHAR(20)   NOT NULL DEFAULT 'Pending',
    transaction_id     VARCHAR(200),
    gateway_reference  VARCHAR(200),
    amount_paid        NUMERIC(10,2) NOT NULL,
    gateway_charges    NUMERIC(10,2),
    receipt_url        VARCHAR(500),
    paid_at            TIMESTAMPTZ,
    paid_by            UUID,
    -- audit
    created_by         UUID          NOT NULL,
    created_date       TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by        UUID,
    modified_date      TIMESTAMPTZ,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted         BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number     INTEGER       NOT NULL DEFAULT 1,
    row_hash           BYTEA,
    source_system      VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_payment              PRIMARY KEY (id),
    CONSTRAINT ck_payment_mode         CHECK (mode IN ('UPI','Card','NetBanking','Cash','BankTransfer')),
    CONSTRAINT ck_payment_status       CHECK (status IN ('Success','Failed','Pending')),
    CONSTRAINT fk_pay_fee              FOREIGN KEY (fee_id)     REFERENCES siraguwin.fee(id),
    CONSTRAINT fk_pay_paid_by          FOREIGN KEY (paid_by)    REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_pay_created          FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_pay_modified         FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_pay_fee_id        ON siraguwin.payment (fee_id);
CREATE INDEX idx_pay_status        ON siraguwin.payment (status);
CREATE INDEX idx_pay_txn_id        ON siraguwin.payment (transaction_id);
CREATE INDEX idx_pay_paid_at       ON siraguwin.payment (paid_at);
CREATE INDEX idx_pay_created_date  ON siraguwin.payment (created_date);
CREATE INDEX idx_pay_is_active     ON siraguwin.payment (is_active);
CREATE INDEX idx_pay_is_deleted    ON siraguwin.payment (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. PLATFORM_INVOICE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.platform_invoice (
    id                    UUID          NOT NULL DEFAULT gen_random_uuid(),
    center_id             UUID          NOT NULL,
    invoice_number        VARCHAR(50)   NOT NULL,
    student_count         INTEGER       NOT NULL,
    rate_per_student      NUMERIC(10,2) NOT NULL,
    sub_total             NUMERIC(10,2) NOT NULL,
    gst_rate              NUMERIC(5,2)  NOT NULL DEFAULT 18.00,
    gst_amount            NUMERIC(10,2) NOT NULL,
    total_amount          NUMERIC(10,2) NOT NULL,
    billing_period_start  DATE          NOT NULL,
    billing_period_end    DATE          NOT NULL,
    due_date              DATE          NOT NULL,
    status                VARCHAR(20)   NOT NULL DEFAULT 'Generated',
    gst_invoice_url       VARCHAR(500),
    generated_at          TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    -- audit
    created_by            UUID          NOT NULL,
    created_date          TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by           UUID,
    modified_date         TIMESTAMPTZ,
    is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted            BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number        INTEGER       NOT NULL DEFAULT 1,
    row_hash              BYTEA,
    source_system         VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_platform_invoice          PRIMARY KEY (id),
    CONSTRAINT uq_pi_invoice_number         UNIQUE (invoice_number),
    CONSTRAINT ck_pi_status                 CHECK (status IN ('Generated','Paid','Overdue','Waived')),
    CONSTRAINT fk_pi_center                 FOREIGN KEY (center_id)  REFERENCES siraguwin.center(id),
    CONSTRAINT fk_pi_created                FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_pi_modified               FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_pi_center_id     ON siraguwin.platform_invoice (center_id);
CREATE INDEX idx_pi_inv_number    ON siraguwin.platform_invoice (invoice_number);
CREATE INDEX idx_pi_due_date      ON siraguwin.platform_invoice (due_date);
CREATE INDEX idx_pi_status        ON siraguwin.platform_invoice (status);
CREATE INDEX idx_pi_created_date  ON siraguwin.platform_invoice (created_date);
CREATE INDEX idx_pi_is_active     ON siraguwin.platform_invoice (is_active);
CREATE INDEX idx_pi_is_deleted    ON siraguwin.platform_invoice (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. PLATFORM_PAYMENT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.platform_payment (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    invoice_id      UUID          NOT NULL,
    mode            VARCHAR(20)   NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'Pending',
    transaction_id  VARCHAR(200),
    amount_paid     NUMERIC(10,2) NOT NULL,
    paid_at         TIMESTAMPTZ,
    paid_by         UUID,
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_platform_payment          PRIMARY KEY (id),
    CONSTRAINT ck_pp_mode                   CHECK (mode IN ('UPI','Card','NetBanking')),
    CONSTRAINT ck_pp_status                 CHECK (status IN ('Success','Failed','Pending')),
    CONSTRAINT fk_pp_invoice                FOREIGN KEY (invoice_id) REFERENCES siraguwin.platform_invoice(id),
    CONSTRAINT fk_pp_paid_by                FOREIGN KEY (paid_by)    REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_pp_created                FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_pp_modified               FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_pp_invoice_id    ON siraguwin.platform_payment (invoice_id);
CREATE INDEX idx_pp_status        ON siraguwin.platform_payment (status);
CREATE INDEX idx_pp_txn_id        ON siraguwin.platform_payment (transaction_id);
CREATE INDEX idx_pp_paid_at       ON siraguwin.platform_payment (paid_at);
CREATE INDEX idx_pp_created_date  ON siraguwin.platform_payment (created_date);
CREATE INDEX idx_pp_is_active     ON siraguwin.platform_payment (is_active);
CREATE INDEX idx_pp_is_deleted    ON siraguwin.platform_payment (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. MERGE_LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.merge_log (
    id                 UUID          NOT NULL DEFAULT gen_random_uuid(),
    student_kept_id    UUID          NOT NULL,
    student_merged_id  UUID          NOT NULL,  -- no FK; merged record may be deleted
    match_priority     VARCHAR(20)   NOT NULL,
    matched_fields     VARCHAR(200)  NOT NULL,
    action             VARCHAR(20)   NOT NULL,
    actioned_by        UUID          NOT NULL,
    actioned_at        TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    notes              VARCHAR(500),
    -- audit
    created_by         UUID          NOT NULL,
    created_date       TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by        UUID,
    modified_date      TIMESTAMPTZ,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted         BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number     INTEGER       NOT NULL DEFAULT 1,
    row_hash           BYTEA,
    source_system      VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_merge_log               PRIMARY KEY (id),
    CONSTRAINT ck_ml_priority             CHECK (match_priority IN ('1_Auto','2_Fuzzy','3_Manual','4_Partial')),
    CONSTRAINT ck_ml_action               CHECK (action IN ('Merged','Rejected','Undone')),
    CONSTRAINT fk_ml_student_kept         FOREIGN KEY (student_kept_id) REFERENCES siraguwin.student(id),
    CONSTRAINT fk_ml_actioned_by          FOREIGN KEY (actioned_by)     REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ml_created              FOREIGN KEY (created_by)      REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ml_modified             FOREIGN KEY (modified_by)     REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_ml_kept_id       ON siraguwin.merge_log (student_kept_id);
CREATE INDEX idx_ml_merged_id     ON siraguwin.merge_log (student_merged_id);
CREATE INDEX idx_ml_priority      ON siraguwin.merge_log (match_priority);
CREATE INDEX idx_ml_action        ON siraguwin.merge_log (action);
CREATE INDEX idx_ml_created_date  ON siraguwin.merge_log (created_date);
CREATE INDEX idx_ml_is_active     ON siraguwin.merge_log (is_active);
CREATE INDEX idx_ml_is_deleted    ON siraguwin.merge_log (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. NOTIFICATION_LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.notification_log (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID          NOT NULL,
    center_id        UUID,
    type             VARCHAR(50)   NOT NULL,
    category         VARCHAR(50)   NOT NULL,
    title            VARCHAR(200)  NOT NULL,
    body             VARCHAR(1000) NOT NULL,
    reference_type   VARCHAR(50),
    reference_id     UUID,
    delivery_status  VARCHAR(20)   NOT NULL DEFAULT 'Queued',
    sent_at          TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    read_at          TIMESTAMPTZ,
    failure_reason   VARCHAR(500),
    -- audit
    created_by       UUID          NOT NULL,
    created_date     TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by      UUID,
    modified_date    TIMESTAMPTZ,
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number   INTEGER       NOT NULL DEFAULT 1,
    row_hash         BYTEA,
    source_system    VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_notification_log          PRIMARY KEY (id),
    CONSTRAINT ck_nl_type                   CHECK (type IN ('Push','SMS','Email','InApp')),
    CONSTRAINT ck_nl_delivery_status        CHECK (delivery_status IN ('Queued','Sent','Delivered','Failed','Read')),
    CONSTRAINT fk_nl_user                   FOREIGN KEY (user_id)    REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_nl_center                 FOREIGN KEY (center_id)  REFERENCES siraguwin.center(id),
    CONSTRAINT fk_nl_created                FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_nl_modified               FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_nl_user_id       ON siraguwin.notification_log (user_id);
CREATE INDEX idx_nl_center_id     ON siraguwin.notification_log (center_id);
CREATE INDEX idx_nl_type          ON siraguwin.notification_log (type);
CREATE INDEX idx_nl_category      ON siraguwin.notification_log (category);
CREATE INDEX idx_nl_delivery      ON siraguwin.notification_log (delivery_status);
CREATE INDEX idx_nl_created_date  ON siraguwin.notification_log (created_date);
CREATE INDEX idx_nl_is_active     ON siraguwin.notification_log (is_active);
CREATE INDEX idx_nl_is_deleted    ON siraguwin.notification_log (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. AUDIT_LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.audit_log (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID,
    action          VARCHAR(50)   NOT NULL,
    entity_type     VARCHAR(50)   NOT NULL,
    entity_id       UUID          NOT NULL,
    old_values      TEXT,
    new_values      TEXT,
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    "timestamp"     TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    session_id      VARCHAR(100),
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_audit_log           PRIMARY KEY (id),
    CONSTRAINT fk_al_user             FOREIGN KEY (user_id)    REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_al_created          FOREIGN KEY (created_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_al_modified         FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_al_user_id      ON siraguwin.audit_log (user_id);
CREATE INDEX idx_al_action       ON siraguwin.audit_log (action);
CREATE INDEX idx_al_entity_type  ON siraguwin.audit_log (entity_type);
CREATE INDEX idx_al_entity_id    ON siraguwin.audit_log (entity_id);
CREATE INDEX idx_al_timestamp    ON siraguwin.audit_log ("timestamp");
CREATE INDEX idx_al_created_date ON siraguwin.audit_log (created_date);
CREATE INDEX idx_al_is_active    ON siraguwin.audit_log (is_active);
CREATE INDEX idx_al_is_deleted   ON siraguwin.audit_log (is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- 22. APP_CONFIG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE siraguwin.app_config (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    config_key      VARCHAR(100)  NOT NULL,
    config_value    VARCHAR(500)  NOT NULL,
    data_type       VARCHAR(20)   NOT NULL DEFAULT 'String',
    description     VARCHAR(500),
    updated_by      UUID,
    updated_at      TIMESTAMPTZ,
    -- audit
    created_by      UUID          NOT NULL,
    created_date    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    modified_by     UUID,
    modified_date   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    version_number  INTEGER       NOT NULL DEFAULT 1,
    row_hash        BYTEA,
    source_system   VARCHAR(50)   NOT NULL DEFAULT 'SiraguWing',

    CONSTRAINT pk_app_config           PRIMARY KEY (id),
    CONSTRAINT uq_app_config_key       UNIQUE (config_key),
    CONSTRAINT fk_ac_updated_by        FOREIGN KEY (updated_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ac_created           FOREIGN KEY (created_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ac_modified          FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX idx_ac_config_key    ON siraguwin.app_config (config_key);
CREATE INDEX idx_ac_created_date  ON siraguwin.app_config (created_date);
CREATE INDEX idx_ac_is_active     ON siraguwin.app_config (is_active);
CREATE INDEX idx_ac_is_deleted    ON siraguwin.app_config (is_deleted);


-- ============================================================================
-- SECTION 3: SAMPLE DATA (INSERT SCRIPTS)
-- ============================================================================
-- Realistic data aligned with SiraguWing workflow — Chennai pilot.
-- Fixed UUIDs for referential integrity.
-- ============================================================================

SET search_path TO siraguwin, public;

-- ─── USERS ──────────────────────────────────────────────────────────────────
-- 5 users: 1 admin, 2 owners, 1 teacher, 1 parent
BEGIN;
SET CONSTRAINTS ALL DEFERRED;

INSERT INTO siraguwin."user" (id, mobile_number, name, email, status, preferred_language, device_platform, last_login_at, created_by) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+919876543210', 'Priya Sharma',   'priya@gmail.com',   'Active', 'en', 'Android', '2026-03-28T10:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '+919123456789', 'Rajesh Kumar',   'rajesh@outlook.com','Active', 'ta', 'Android', '2026-03-27T08:30:00Z', 'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '+918765432101', 'Anitha Devi',    'anitha@yahoo.com',  'Active', 'en', 'iOS',     '2026-03-28T07:00:00Z', 'c3d4e5f6-a7b8-9012-cdef-123456789012'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', '+917654321098', 'Karthik Rajan',  NULL,                'Active', 'ta', 'Android', '2026-03-28T09:15:00Z', 'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '+916543210987', 'Meena Sundar',   'meena@gmail.com',   'Active', 'en', 'iOS',     '2026-03-27T18:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234');

COMMIT;

-- ─── USER_ROLES ─────────────────────────────────────────────────────────────
-- Priya = Owner (center1) + Admin; Rajesh = Owner (center2); Karthik = Teacher; Anitha = Parent; Meena = Parent
INSERT INTO siraguwin.user_role (id, user_id, role, center_id, assigned_at, created_by) VALUES
  ('e1000001-aaaa-bbbb-cccc-dddddddddddd', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'Admin',   NULL, '2026-01-01T09:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234');
-- center_id roles inserted after center data

-- ─── CENTERS ────────────────────────────────────────────────────────────────
INSERT INTO siraguwin.center (id, owner_id, name, category, owner_name, mobile_number, address, city,
    latitude, longitude, operating_days, operating_timings, age_group, description, logo_url,
    registration_status, subscription_status, approved_at, trial_ends_at, created_by) VALUES
  ('c7e00001-aaaa-bbbb-cccc-dddddddddddd',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Bright Minds Academy', 'Tuition', 'Priya Sharma', '+919876543210',
   '12 Anna Nagar 2nd Street, Chennai', 'Chennai',
   13.0827000, 80.2707000, 'Mon,Tue,Wed,Thu,Fri', '09:00-18:00', '6-15 years',
   'Leading tuition center in Anna Nagar offering quality education in Mathematics, Science, and English for classes 6 through 10.',
   'https://cdn.siraguwin.in/logos/ctr001.png',
   'Approved', 'Active', '2026-01-16T12:00:00Z', '2026-04-16T23:59:59Z',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),

  ('c7e00002-aaaa-bbbb-cccc-dddddddddddd',
   'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Little Stars Daycare', 'Daycare', 'Rajesh Kumar', '+919123456789',
   '45 Adyar Main Road, Chennai', 'Chennai',
   13.0067000, 80.2573000, 'Mon,Tue,Wed,Thu,Fri,Sat', '08:00-19:00', '1-5 years',
   'Safe and nurturing daycare environment for your little ones with CCTV monitoring, nutritious meals, and certified caregivers.',
   'https://cdn.siraguwin.in/logos/ctr002.png',
   'Approved', 'Trial', '2026-02-05T09:00:00Z', '2026-05-05T23:59:59Z',
   'b2c3d4e5-f6a7-8901-bcde-f12345678901'),

  ('c7e00003-aaaa-bbbb-cccc-dddddddddddd',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Rhythm Dance School', 'Dance', 'Priya Sharma', '+919876543210',
   '78 T Nagar, Chennai', 'Chennai',
   13.0418000, 80.2341000, 'Sat,Sun', '10:00-13:00', '5-18 years',
   'Professional dance training in Bharatanatyam and contemporary styles. Weekend classes with experienced choreographers and annual recitals.',
   'https://cdn.siraguwin.in/logos/ctr003.png',
   'Submitted', 'Trial', NULL, NULL,
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- Now insert remaining user_role records that need center_id
INSERT INTO siraguwin.user_role (id, user_id, role, center_id, assigned_at, created_by) VALUES
  ('e1000002-aaaa-bbbb-cccc-dddddddddddd', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Owner',   'c7e00001-aaaa-bbbb-cccc-dddddddddddd', '2026-01-15T09:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('e1000003-aaaa-bbbb-cccc-dddddddddddd', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Owner',   'c7e00002-aaaa-bbbb-cccc-dddddddddddd', '2026-02-01T10:00:00Z', 'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('e1000004-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Teacher', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', '2026-01-17T10:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('e1000005-aaaa-bbbb-cccc-dddddddddddd', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Parent',  NULL, '2026-01-20T08:00:00Z', 'c3d4e5f6-a7b8-9012-cdef-123456789012'),
  ('e1000006-aaaa-bbbb-cccc-dddddddddddd', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Owner',   'c7e00003-aaaa-bbbb-cccc-dddddddddddd', '2026-03-01T08:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- ─── OTP_LOG ────────────────────────────────────────────────────────────────
INSERT INTO siraguwin.otp_log (id, mobile_number, otp_hash, purpose, status, sent_at, expires_at, verified_at, ip_address, user_agent, created_by) VALUES
  ('07900001-aaaa-bbbb-cccc-dddddddddddd', '+919876543210', '5e884898da28047151d0e56f8dc62927', 'Login', 'Verified', '2026-03-28T09:55:00Z', '2026-03-28T10:00:00Z', '2026-03-28T09:56:30Z', '192.168.1.1', 'SiraguWing/1.0 Android', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('07900002-aaaa-bbbb-cccc-dddddddddddd', '+919123456789', 'a2c3b4d5e6f71234567890abcdef1234', 'Login', 'Verified', '2026-03-27T08:25:00Z', '2026-03-27T08:30:00Z', '2026-03-27T08:26:00Z', '10.0.0.5',    'SiraguWing/1.0 Android', 'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('07900003-aaaa-bbbb-cccc-dddddddddddd', '+918765432101', 'b3c4d5e6f7a890123456789abcdef012', 'Registration', 'Expired', '2026-03-28T06:50:00Z', '2026-03-28T06:55:00Z', NULL, '172.16.0.1', 'SiraguWing/1.0 iOS', 'c3d4e5f6-a7b8-9012-cdef-123456789012'),
  ('07900004-aaaa-bbbb-cccc-dddddddddddd', '+918765432101', 'c4d5e6f7a890123456789abcdef01234', 'Registration', 'Verified', '2026-03-28T06:56:00Z', '2026-03-28T07:01:00Z', '2026-03-28T06:57:00Z', '172.16.0.1', 'SiraguWing/1.0 iOS', 'c3d4e5f6-a7b8-9012-cdef-123456789012');

-- ─── STUDENTS ───────────────────────────────────────────────────────────────
INSERT INTO siraguwin.student (id, parent_id, name, date_of_birth, gender, medical_notes, created_by_path, created_by) VALUES
  ('57000001-aaaa-bbbb-cccc-dddddddddddd', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Arun Kumar',   '2015-05-15', 'Male',   NULL,                         'Center', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('57000002-aaaa-bbbb-cccc-dddddddddddd', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Kavitha S',    '2016-11-20', 'Female', NULL,                         'Parent', 'c3d4e5f6-a7b8-9012-cdef-123456789012'),
  ('57000003-aaaa-bbbb-cccc-dddddddddddd', NULL,                                    'Deepak R',     '2014-03-08', 'Male',   'Asthma - carries inhaler',   'Center', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('57000004-aaaa-bbbb-cccc-dddddddddddd', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'Lakshmi M',    '2022-07-12', 'Female', 'Peanut allergy - severe',    'Center', 'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('57000005-aaaa-bbbb-cccc-dddddddddddd', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'Surya Prakash', '2023-01-25', 'Male',  'Lactose intolerant',         'Parent', 'e5f6a7b8-c9d0-1234-efab-345678901234');

-- ─── CENTER_STUDENT ─────────────────────────────────────────────────────────
INSERT INTO siraguwin.center_student (id, center_id, student_id, invite_status, invite_link, status, added_at, linked_at, created_by) VALUES
  ('c5000001-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', '57000001-aaaa-bbbb-cccc-dddddddddddd', 'Linked',   'https://app.siraguwin.in/invite/abc123', 'Active',  '2026-01-20T10:00:00Z', '2026-01-21T08:30:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c5000002-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', '57000002-aaaa-bbbb-cccc-dddddddddddd', 'Sent',     'https://app.siraguwin.in/invite/def456', 'Active',  '2026-02-01T09:00:00Z', NULL,                   'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c5000003-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', '57000003-aaaa-bbbb-cccc-dddddddddddd', 'Accepted', 'https://app.siraguwin.in/invite/ghi789', 'Active',  '2026-01-25T11:00:00Z', '2026-01-26T07:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c5000004-aaaa-bbbb-cccc-dddddddddddd', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', '57000004-aaaa-bbbb-cccc-dddddddddddd', 'Linked',   'https://app.siraguwin.in/invite/jkl012', 'Active',  '2026-02-10T09:00:00Z', '2026-02-11T07:00:00Z', 'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('c5000005-aaaa-bbbb-cccc-dddddddddddd', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', '57000005-aaaa-bbbb-cccc-dddddddddddd', 'Linked',   'https://app.siraguwin.in/invite/mno345', 'Active',  '2026-02-12T10:00:00Z', '2026-02-12T18:00:00Z', 'b2c3d4e5-f6a7-8901-bcde-f12345678901');

-- ─── STUDENT_INVITE ─────────────────────────────────────────────────────────
INSERT INTO siraguwin.student_invite (id, center_student_id, link_token, status, channel, sent_at, expires_at, opened_at, accepted_at, attempt_count, created_by) VALUES
  ('16b00001-aaaa-bbbb-cccc-dddddddddddd', 'c5000001-aaaa-bbbb-cccc-dddddddddddd', 'abc123def456', 'Accepted', 'SMS',      '2026-01-20T10:05:00Z', '2026-01-27T10:05:00Z', '2026-01-20T18:00:00Z', '2026-01-21T08:30:00Z', 1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('16b00002-aaaa-bbbb-cccc-dddddddddddd', 'c5000002-aaaa-bbbb-cccc-dddddddddddd', 'ghi789jkl012', 'Sent',     'WhatsApp', '2026-02-01T09:05:00Z', '2026-02-08T09:05:00Z', NULL,                   NULL,                   1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('16b00003-aaaa-bbbb-cccc-dddddddddddd', 'c5000003-aaaa-bbbb-cccc-dddddddddddd', 'mno345pqr678', 'Accepted', 'SMS',      '2026-01-25T11:05:00Z', '2026-02-01T11:05:00Z', '2026-01-25T18:00:00Z', '2026-01-26T07:00:00Z', 1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('16b00004-aaaa-bbbb-cccc-dddddddddddd', 'c5000004-aaaa-bbbb-cccc-dddddddddddd', 'pqr678stu901', 'Accepted', 'SMS',      '2026-02-10T09:05:00Z', '2026-02-17T09:05:00Z', '2026-02-10T12:00:00Z', '2026-02-11T07:00:00Z', 1, 'b2c3d4e5-f6a7-8901-bcde-f12345678901');

-- ─── CENTER_TEACHER ─────────────────────────────────────────────────────────
INSERT INTO siraguwin.center_teacher (id, center_id, user_id, specialisation, joined_at, created_by) VALUES
  ('c7000001-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Mathematics',    '2026-01-17T10:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c7000002-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Science',        '2026-01-17T10:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c7000003-aaaa-bbbb-cccc-dddddddddddd', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Early Childhood','2026-02-10T08:00:00Z', 'b2c3d4e5-f6a7-8901-bcde-f12345678901');

-- ─── BATCHES ────────────────────────────────────────────────────────────────
INSERT INTO siraguwin.batch (id, center_id, teacher_id, course_name, batch_name, category_type, class_days, start_time, end_time, strength_limit, fee_amount, created_by) VALUES
  ('ba700001-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'c7000001-aaaa-bbbb-cccc-dddddddddddd', 'Mathematics Grade 10',       'Batch A - Morning', 'Tuition', 'Mon,Wed,Fri', '09:00', '10:30', 30, 2000.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('ba700002-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'c7000002-aaaa-bbbb-cccc-dddddddddddd', 'Science Grade 10',           'Batch B - Evening', 'Tuition', 'Tue,Thu,Sat', '16:00', '17:30', 25, 2500.00, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('ba700003-aaaa-bbbb-cccc-dddddddddddd', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', 'c7000003-aaaa-bbbb-cccc-dddddddddddd', 'Toddler Care & Activities',  'Morning Stars',     'Daycare', 'Mon,Tue,Wed,Thu,Fri', '08:30', '12:30', 15, 5000.00, 'b2c3d4e5-f6a7-8901-bcde-f12345678901');

-- ─── BATCH_STUDENT ──────────────────────────────────────────────────────────
INSERT INTO siraguwin.batch_student (id, batch_id, student_id, assigned_at, created_by) VALUES
  ('b5000001-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', '57000001-aaaa-bbbb-cccc-dddddddddddd', '2026-01-22T10:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('b5000002-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', '57000003-aaaa-bbbb-cccc-dddddddddddd', '2026-01-27T10:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('b5000003-aaaa-bbbb-cccc-dddddddddddd', 'ba700002-aaaa-bbbb-cccc-dddddddddddd', '57000001-aaaa-bbbb-cccc-dddddddddddd', '2026-02-03T09:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('b5000004-aaaa-bbbb-cccc-dddddddddddd', 'ba700003-aaaa-bbbb-cccc-dddddddddddd', '57000004-aaaa-bbbb-cccc-dddddddddddd', '2026-02-12T08:00:00Z', 'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('b5000005-aaaa-bbbb-cccc-dddddddddddd', 'ba700003-aaaa-bbbb-cccc-dddddddddddd', '57000005-aaaa-bbbb-cccc-dddddddddddd', '2026-02-14T09:00:00Z', 'b2c3d4e5-f6a7-8901-bcde-f12345678901');

-- ─── ATTENDANCE ─────────────────────────────────────────────────────────────
INSERT INTO siraguwin.attendance (id, batch_id, student_id, marked_by, attendance_date, status, marked_at, edited_at, edited_by, previous_status, created_by) VALUES
  ('a7700001-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', '57000001-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', '2026-03-28', 'Present', '2026-03-28T09:05:00Z', NULL,                   NULL,                                    NULL,      'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('a7700002-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', '57000003-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', '2026-03-28', 'Absent',  '2026-03-28T09:05:00Z', '2026-03-28T11:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Present', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('a7700003-aaaa-bbbb-cccc-dddddddddddd', 'ba700003-aaaa-bbbb-cccc-dddddddddddd', '57000004-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', '2026-03-28', 'Present', '2026-03-28T08:35:00Z', NULL,                   NULL,                                    NULL,      'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('a7700004-aaaa-bbbb-cccc-dddddddddddd', 'ba700003-aaaa-bbbb-cccc-dddddddddddd', '57000005-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', '2026-03-28', 'Present', '2026-03-28T08:35:00Z', NULL,                   NULL,                                    NULL,      'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('a7700005-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', '57000001-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', '2026-03-26', 'Present', '2026-03-26T09:02:00Z', NULL,                   NULL,                                    NULL,      'd4e5f6a7-b8c9-0123-defa-234567890123');

-- ─── MATERIAL ───────────────────────────────────────────────────────────────
INSERT INTO siraguwin.material (id, batch_id, uploaded_by, center_id, title, description, type, file_url, file_size_bytes, visibility, publish_date, reviewed_by, reviewed_at, created_by) VALUES
  ('5a700001-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'Chapter 5 - Algebra Notes',       'Algebra chapter 5 revision notes covering quadratic equations',       'PDF',       'https://cdn.siraguwin.in/materials/ch5.pdf',    2048000, 'Published',     '2026-03-25T09:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-03-25T10:00:00Z', 'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('5a700002-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'Practice Worksheet - Trigonometry','Complete all 20 questions before Friday class',                       'Image',     'https://cdn.siraguwin.in/materials/ws1.jpg',     512000, 'Published',     '2026-03-27T09:00:00Z', NULL,                                    NULL,                   'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('5a700003-aaaa-bbbb-cccc-dddddddddddd', 'ba700002-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'Photosynthesis Video',            'Watch this Khan Academy video before Thursday class',                 'VideoLink', 'https://youtube.com/watch?v=abc123',         NULL,    'Published',     '2026-03-28T09:00:00Z', NULL,                                    NULL,                   'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('5a700004-aaaa-bbbb-cccc-dddddddddddd', 'ba700003-aaaa-bbbb-cccc-dddddddddddd', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', 'Weekly Activity Plan',            'Finger painting, sand play, and storytelling activities for this week','PDF',       'https://cdn.siraguwin.in/materials/plan.pdf',   1024000, 'PendingReview', '2026-04-01T08:00:00Z', NULL,                                    NULL,                   'b2c3d4e5-f6a7-8901-bcde-f12345678901');

-- ─── ANNOUNCEMENT ───────────────────────────────────────────────────────────
INSERT INTO siraguwin.announcement (id, center_id, batch_id, authored_by, title, message_body, attachment_url, target, publish_at, is_published, created_by) VALUES
  ('a6600001-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', NULL,                                    'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Holiday Notice',         'Center will be closed on January 26 for Republic Day. Classes resume on January 27.',                       NULL,                                          'AllParents', '2026-01-24T08:00:00Z', TRUE,  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('a6600002-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd',  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Exam Schedule Released', 'Final exams for Math batch start from March 15. Check the attached schedule for details.',                  'https://cdn.siraguwin.in/ann/schedule.pdf',      'Batch',      '2026-03-10T09:00:00Z', TRUE,  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('a6600003-aaaa-bbbb-cccc-dddddddddddd', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', NULL,                                    'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Annual Day Invitation',  'You are cordially invited to our Annual Day celebration on April 5th at 4 PM. Refreshments will be served.','https://cdn.siraguwin.in/ann/invite.jpg',        'AllParents', '2026-03-25T10:00:00Z', TRUE,  'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('a6600004-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', NULL,                                    'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Summer Camp Registrations','Summer coding and robotics camp open for registration. Limited seats available. Contact center for details.',NULL,                                          'AllParents', '2026-04-01T08:00:00Z', FALSE, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- ─── MESSAGE ────────────────────────────────────────────────────────────────
INSERT INTO siraguwin.message (id, center_id, sender_id, recipient_id, thread_id, topic_tag, body, is_read, sent_at, read_at, created_by) VALUES
  ('55900001-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NULL,                                    'Fee',      'When is the next fee due for Arun?',       TRUE,  '2026-03-27T14:00:00Z', '2026-03-27T15:00:00Z', 'c3d4e5f6-a7b8-9012-cdef-123456789012'),
  ('55900002-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c3d4e5f6-a7b8-9012-cdef-123456789012', '55900001-aaaa-bbbb-cccc-dddddddddddd', 'Fee',      'Fee of Rs 2000 is due on April 5th.',      TRUE,  '2026-03-27T14:30:00Z', '2026-03-27T16:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('55900003-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'd4e5f6a7-b8c9-0123-defa-234567890123', NULL,                                    'Homework', 'Arun has not received today homework sheet. Could you please share?', FALSE, '2026-03-28T09:00:00Z', NULL,                   'c3d4e5f6-a7b8-9012-cdef-123456789012'),
  ('55900004-aaaa-bbbb-cccc-dddddddddddd', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', NULL,                                    'General',  'Can Lakshmi stay an extra hour on Friday?', FALSE, '2026-03-28T08:15:00Z', NULL,                   'e5f6a7b8-c9d0-1234-efab-345678901234');

-- ─── FEE ────────────────────────────────────────────────────────────────────
INSERT INTO siraguwin.fee (id, center_id, student_id, batch_id, amount, due_date, status, notes, reminder_count, whatsapp_link_generated, created_by) VALUES
  ('fee00001-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', '57000001-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', 2000.00, '2026-04-05', 'Pending', NULL,                       0, FALSE, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('fee00002-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', '57000003-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', 2000.00, '2026-04-05', 'Pending', NULL,                       0, FALSE, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('fee00003-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', '57000001-aaaa-bbbb-cccc-dddddddddddd', 'ba700001-aaaa-bbbb-cccc-dddddddddddd', 2000.00, '2026-03-05', 'Paid',    'Paid via cash on March 3', 0, FALSE, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('fee00004-aaaa-bbbb-cccc-dddddddddddd', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', '57000004-aaaa-bbbb-cccc-dddddddddddd', 'ba700003-aaaa-bbbb-cccc-dddddddddddd', 5000.00, '2026-04-10', 'Pending', NULL,                       1, TRUE,  'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('fee00005-aaaa-bbbb-cccc-dddddddddddd', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', '57000005-aaaa-bbbb-cccc-dddddddddddd', 'ba700003-aaaa-bbbb-cccc-dddddddddddd', 5000.00, '2026-03-10', 'Overdue', 'Second reminder sent',     2, TRUE,  'b2c3d4e5-f6a7-8901-bcde-f12345678901');

-- ─── PAYMENT ────────────────────────────────────────────────────────────────
INSERT INTO siraguwin.payment (id, fee_id, mode, status, transaction_id, gateway_reference, amount_paid, gateway_charges, receipt_url, paid_at, paid_by, created_by) VALUES
  ('9ae00001-aaaa-bbbb-cccc-dddddddddddd', 'fee00003-aaaa-bbbb-cccc-dddddddddddd', 'Cash',  'Success', NULL,                  NULL,                2000.00, 0.00,  NULL,                                          '2026-03-03T14:30:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('9ae00002-aaaa-bbbb-cccc-dddddddddddd', 'fee00004-aaaa-bbbb-cccc-dddddddddddd', 'UPI',   'Failed',  'TXN2026032800001',    'RAZORPAY_xyz789',   5000.00, NULL,  NULL,                                          NULL,                   'e5f6a7b8-c9d0-1234-efab-345678901234', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('9ae00003-aaaa-bbbb-cccc-dddddddddddd', 'fee00005-aaaa-bbbb-cccc-dddddddddddd', 'UPI',   'Success', 'TXN2026031000002',    'RAZORPAY_abc123',   5000.00, 100.00,'https://cdn.siraguwin.in/receipts/r003.pdf',      '2026-03-10T10:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'e5f6a7b8-c9d0-1234-efab-345678901234');

-- ─── PLATFORM_INVOICE ───────────────────────────────────────────────────────
INSERT INTO siraguwin.platform_invoice (id, center_id, invoice_number, student_count, rate_per_student, sub_total, gst_rate, gst_amount, total_amount, billing_period_start, billing_period_end, due_date, status, generated_at, created_by) VALUES
  ('916b0001-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'SW-2026-03-001', 3, 10.00, 30.00,  18.00, 5.40,   35.40,  '2026-03-01', '2026-03-31', '2026-04-07', 'Generated', '2026-04-01T00:05:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('916b0002-aaaa-bbbb-cccc-dddddddddddd', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', 'SW-2026-03-002', 2, 10.00, 20.00,  18.00, 3.60,   23.60,  '2026-03-01', '2026-03-31', '2026-04-07', 'Generated', '2026-04-01T00:05:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('916b0003-aaaa-bbbb-cccc-dddddddddddd', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'SW-2026-02-001', 3, 10.00, 30.00,  18.00, 5.40,   35.40,  '2026-02-01', '2026-02-28', '2026-03-07', 'Paid',      '2026-03-01T00:05:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234');

-- ─── PLATFORM_PAYMENT ───────────────────────────────────────────────────────
INSERT INTO siraguwin.platform_payment (id, invoice_id, mode, status, transaction_id, amount_paid, paid_at, paid_by, created_by) VALUES
  ('99ae0001-aaaa-bbbb-cccc-dddddddddddd', '916b0003-aaaa-bbbb-cccc-dddddddddddd', 'UPI', 'Success', 'PTXN2026030300001', 35.40, '2026-03-03T10:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('99ae0002-aaaa-bbbb-cccc-dddddddddddd', '916b0001-aaaa-bbbb-cccc-dddddddddddd', 'UPI', 'Pending', NULL,                35.40, NULL,                   NULL,                                    'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- ─── MERGE_LOG ──────────────────────────────────────────────────────────────
INSERT INTO siraguwin.merge_log (id, student_kept_id, student_merged_id, match_priority, matched_fields, action, actioned_by, actioned_at, notes, created_by) VALUES
  ('54000001-aaaa-bbbb-cccc-dddddddddddd', '57000001-aaaa-bbbb-cccc-dddddddddddd', '57000003-aaaa-bbbb-cccc-dddddddddddd', '2_Fuzzy', 'Name+DOB', 'Rejected', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-02-15T10:00:00Z', 'Different students - names similar but different parents', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- ─── NOTIFICATION_LOG ───────────────────────────────────────────────────────
INSERT INTO siraguwin.notification_log (id, user_id, center_id, type, category, title, body, reference_type, reference_id, delivery_status, sent_at, delivered_at, read_at, created_by) VALUES
  ('67f00001-aaaa-bbbb-cccc-dddddddddddd', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'Push',  'Announcement',  'Bright Minds Academy: Holiday Notice',     'Center will be closed on Jan 26 for Republic Day',       'Announcement', 'a6600001-aaaa-bbbb-cccc-dddddddddddd', 'Delivered', '2026-01-24T08:01:00Z', '2026-01-24T08:01:05Z', '2026-01-24T09:00:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('67f00002-aaaa-bbbb-cccc-dddddddddddd', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'c7e00001-aaaa-bbbb-cccc-dddddddddddd', 'SMS',   'Invite',        'You have been invited to join Bright Minds','Click to link your child Arun to Bright Minds Academy', 'StudentInvite','16b00001-aaaa-bbbb-cccc-dddddddddddd', 'Sent',      '2026-01-20T10:06:00Z', NULL,                   NULL,                   'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('67f00003-aaaa-bbbb-cccc-dddddddddddd', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'c7e00002-aaaa-bbbb-cccc-dddddddddddd', 'Push',  'FeeReminder',   'Fee reminder from Little Stars',            'Your fee of Rs 5000 is due on April 10',                 'Fee',          'fee00004-aaaa-bbbb-cccc-dddddddddddd', 'Failed',    NULL,                   NULL,                   NULL,                   'b2c3d4e5-f6a7-8901-bcde-f12345678901'),
  ('67f00004-aaaa-bbbb-cccc-dddddddddddd', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NULL,                                    'InApp', 'Billing',       'Platform invoice generated',                'Your March 2026 platform invoice of Rs 35.40 is ready',  'PlatformInvoice','916b0001-aaaa-bbbb-cccc-dddddddddddd','Delivered','2026-04-01T00:06:00Z','2026-04-01T00:06:02Z', NULL,                   'e5f6a7b8-c9d0-1234-efab-345678901234');

-- ─── AUDIT_LOG ──────────────────────────────────────────────────────────────
INSERT INTO siraguwin.audit_log (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, "timestamp", session_id, created_by) VALUES
  ('a0d00001-aaaa-bbbb-cccc-dddddddddddd', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Create', 'Center',  'c7e00001-aaaa-bbbb-cccc-dddddddddddd', NULL,                     '{"name":"Bright Minds Academy","category":"Tuition"}', '192.168.1.1', 'SiraguWing/1.0 Android', '2026-01-15T09:30:00Z', 'sess_abc123', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('a0d00002-aaaa-bbbb-cccc-dddddddddddd', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'Update', 'Center',  'c7e00001-aaaa-bbbb-cccc-dddddddddddd', '{"registration_status":"Submitted"}', '{"registration_status":"Approved"}',          '10.0.0.5',    'Chrome/120',              '2026-01-16T12:00:00Z', 'sess_def456', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('a0d00003-aaaa-bbbb-cccc-dddddddddddd', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Create', 'Attendance','a7700001-aaaa-bbbb-cccc-dddddddddddd', NULL,                    '{"status":"Present","batch_id":"bat00001..."}',         '172.16.0.1',  'SiraguWing/1.0 Android', '2026-03-28T09:05:00Z', 'sess_ghi789', 'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('a0d00004-aaaa-bbbb-cccc-dddddddddddd', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Update', 'Attendance','a7700002-aaaa-bbbb-cccc-dddddddddddd', '{"status":"Present"}', '{"status":"Absent"}',                                   '192.168.1.1', 'SiraguWing/1.0 Android', '2026-03-28T11:00:00Z', 'sess_abc123', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('a0d00005-aaaa-bbbb-cccc-dddddddddddd', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Update', 'Fee',      'fee00003-aaaa-bbbb-cccc-dddddddddddd', '{"status":"Pending"}', '{"status":"Paid"}',                                     '172.16.0.1',  'SiraguWing/1.0 iOS',     '2026-03-03T14:30:00Z', 'sess_jkl012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- ─── APP_CONFIG ─────────────────────────────────────────────────────────────
INSERT INTO siraguwin.app_config (id, config_key, config_value, data_type, description, updated_by, updated_at, created_by) VALUES
  ('cf900001-aaaa-bbbb-cccc-dddddddddddd', 'MaterialVisibilityMode', 'Immediate',  'String',  'Global material visibility: Immediate or RequiresReview',                    'e5f6a7b8-c9d0-1234-efab-345678901234', '2026-01-15T09:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('cf900002-aaaa-bbbb-cccc-dddddddddddd', 'PlatformFeeRate',        '10.00',      'Decimal', 'Per-student monthly platform rate in INR charged to centers',                'e5f6a7b8-c9d0-1234-efab-345678901234', '2026-01-15T09:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('cf900003-aaaa-bbbb-cccc-dddddddddddd', 'InviteExpiryDays',       '7',          'Integer', 'Number of days before a parent invite link expires',                         'e5f6a7b8-c9d0-1234-efab-345678901234', '2026-01-15T09:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('cf900004-aaaa-bbbb-cccc-dddddddddddd', 'OtpExpiryMinutes',       '5',          'Integer', 'Number of minutes before an OTP code expires',                               'e5f6a7b8-c9d0-1234-efab-345678901234', '2026-01-15T09:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('cf900005-aaaa-bbbb-cccc-dddddddddddd', 'MaxFailedLoginAttempts', '5',          'Integer', 'Max consecutive failed OTP attempts before account lock (30 min)',           'e5f6a7b8-c9d0-1234-efab-345678901234', '2026-01-15T09:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('cf900006-aaaa-bbbb-cccc-dddddddddddd', 'TrialPeriodDays',        '90',         'Integer', 'Number of days for center trial period after approval',                      'e5f6a7b8-c9d0-1234-efab-345678901234', '2026-01-15T09:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234'),
  ('cf900007-aaaa-bbbb-cccc-dddddddddddd', 'DataPurgeDelayDays',     '30',         'Integer', 'Days after center suspension before data is purged',                         'e5f6a7b8-c9d0-1234-efab-345678901234', '2026-01-15T09:00:00Z', 'e5f6a7b8-c9d0-1234-efab-345678901234');


-- ============================================================================
-- SECTION 4: NOTES & IMPROVEMENT SUGGESTIONS
-- ============================================================================
/*
  NOTES & SUGGESTED IMPROVEMENTS
  ─────────────────────────────────────────────────────────────────────────────

  1. PARTITIONING:
     - attendance, audit_log, and notification_log are high-volume tables.
       Consider range-partitioning on attendance_date / timestamp / created_date
       once data exceeds ~10M rows.

  2. ROW-LEVEL SECURITY (RLS):
     - PostgreSQL RLS can enforce center-scoped data isolation at the DB layer,
       so even if application code is flawed, a center owner can never see
       another center's records.

  3. FULL-TEXT SEARCH:
     - message.body and announcement.message_body would benefit from GIN
       indexes using tsvector for in-app keyword search.
       Example: CREATE INDEX idx_msg_body_fts ON siraguwin.message USING GIN (to_tsvector('english', body));

  4. SOFT-DELETE FILTERING:
     - Consider creating VIEWs like "v_active_student" that automatically
       filter WHERE is_active = TRUE AND is_deleted = FALSE to simplify
       application queries and prevent accidental inclusion of deleted rows.

  5. ENUM TYPES VS CHECK CONSTRAINTS:
     - PostgreSQL native ENUM types (CREATE TYPE siraguwin.role_type AS ENUM ...)
       offer slightly better storage and type-safety. Current design uses
       VARCHAR + CHECK for maximum portability if migrating to another RDBMS.

  6. OPTIMISTIC CONCURRENCY:
     - version_number columns are present on every table. The application
       should always include "WHERE version_number = ?" in UPDATE statements
       and increment it on success.

  7. ROW HASH FOR ETL:
     - row_hash (BYTEA) columns can be populated by a trigger that computes
       SHA-256 over business columns, enabling CDC (Change Data Capture)
       pipelines to efficiently detect modifications.

  8. BILLING EDGE CASES:
     - center_student.added_at marks billing start and removed_at marks
       billing stop. A scheduled job should compute pro-rata amounts for
       mid-month additions/removals.

  9. SCHEDULED JOBS:
     - OTP cleanup (expire stale 'Sent' OTPs past expires_at)
     - Invite expiry (mark 'Sent' invites as 'Expired' past expires_at)
     - Fee overdue marking (flip 'Pending' → 'Overdue' past due_date)
     - Platform invoice generation (monthly on the 1st)
     - Data purge for suspended centers (past data_purge_at)
     These should be implemented via pg_cron or application-level schedulers.

  10. SECURITY:
      - otp_log.otp_hash stores SHA-256 of the OTP. Never store plaintext.
      - Consider adding a rate-limit counter per mobile_number in Redis/cache
        to complement the FailedLoginAttempts column.
*/
