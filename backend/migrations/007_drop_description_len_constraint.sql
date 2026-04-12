-- Migration 007: Drop the overly strict description length constraint.
-- The ck_center_description_len constraint required description >= 50 chars,
-- which breaks the admin portal when description is short or omitted.
-- Description is optional; NULL is handled by the application layer.

ALTER TABLE siraguwin.center
    DROP CONSTRAINT IF EXISTS ck_center_description_len;
