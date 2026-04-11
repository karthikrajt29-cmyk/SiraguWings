-- ============================================================================
-- MIGRATION 001: Add feed_post and unlink_request tables
-- These tables are referenced in PRD v1.6 but absent from schema v3
-- Run AFTER SiraguWing_schema_v3.sql
-- ============================================================================
SET search_path TO siraguwin, public;

-- ----------------------------------------------------------------------------
-- feed_post
-- Centers submit promotional posts; admin moderates before they go live.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS siraguwin.feed_post (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    center_id         UUID          NOT NULL,
    title             VARCHAR(300)  NOT NULL,
    description       TEXT          NOT NULL,
    image_url         VARCHAR(500),
    category_tag      VARCHAR(50)   NOT NULL,
    cta_url           VARCHAR(500),
    validity_date     DATE,
    status            VARCHAR(20)   NOT NULL DEFAULT 'PendingReview',
    rejection_category VARCHAR(50),
    rejection_reason  VARCHAR(500),
    reviewed_by       UUID,
    reviewed_at       TIMESTAMPTZ,
    published_at      TIMESTAMPTZ,
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

    CONSTRAINT pk_feed_post PRIMARY KEY (id),
    CONSTRAINT ck_fp_status CHECK (status IN ('PendingReview','Approved','Rejected','Live','Archived')),
    CONSTRAINT fk_fp_center      FOREIGN KEY (center_id)   REFERENCES siraguwin.center(id),
    CONSTRAINT fk_fp_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_fp_created     FOREIGN KEY (created_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_fp_modified    FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX IF NOT EXISTS idx_fp_center_id    ON siraguwin.feed_post (center_id);
CREATE INDEX IF NOT EXISTS idx_fp_status       ON siraguwin.feed_post (status);
CREATE INDEX IF NOT EXISTS idx_fp_created_date ON siraguwin.feed_post (created_date);
CREATE INDEX IF NOT EXISTS idx_fp_is_active    ON siraguwin.feed_post (is_active);
CREATE INDEX IF NOT EXISTS idx_fp_is_deleted   ON siraguwin.feed_post (is_deleted);

-- ----------------------------------------------------------------------------
-- unlink_request
-- Parent requests to remove a center from their dashboard.
-- Requires Platform Admin approval per PRD section 12.12.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS siraguwin.unlink_request (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    parent_id         UUID          NOT NULL,
    center_id         UUID          NOT NULL,
    student_id        UUID          NOT NULL,
    reason            VARCHAR(500),
    status            VARCHAR(20)   NOT NULL DEFAULT 'Pending',
    reviewed_by       UUID,
    reviewed_at       TIMESTAMPTZ,
    rejection_reason  VARCHAR(500),
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

    CONSTRAINT pk_unlink_request  PRIMARY KEY (id),
    CONSTRAINT ck_ur_status       CHECK (status IN ('Pending','Approved','Rejected')),
    CONSTRAINT fk_ur_parent       FOREIGN KEY (parent_id)   REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ur_center       FOREIGN KEY (center_id)   REFERENCES siraguwin.center(id),
    CONSTRAINT fk_ur_student      FOREIGN KEY (student_id)  REFERENCES siraguwin.student(id),
    CONSTRAINT fk_ur_reviewed     FOREIGN KEY (reviewed_by) REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ur_created      FOREIGN KEY (created_by)  REFERENCES siraguwin."user"(id),
    CONSTRAINT fk_ur_modified     FOREIGN KEY (modified_by) REFERENCES siraguwin."user"(id)
);

CREATE INDEX IF NOT EXISTS idx_ur_parent_id   ON siraguwin.unlink_request (parent_id);
CREATE INDEX IF NOT EXISTS idx_ur_center_id   ON siraguwin.unlink_request (center_id);
CREATE INDEX IF NOT EXISTS idx_ur_student_id  ON siraguwin.unlink_request (student_id);
CREATE INDEX IF NOT EXISTS idx_ur_status      ON siraguwin.unlink_request (status);
CREATE INDEX IF NOT EXISTS idx_ur_created_date ON siraguwin.unlink_request (created_date);
