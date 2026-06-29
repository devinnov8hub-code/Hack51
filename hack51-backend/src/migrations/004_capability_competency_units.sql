-- ════════════════════════════════════════════════════════════════════════════
-- Migration 004: Competency units nested under role capabilities
-- ════════════════════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL Editor AFTER 001–003. It is additive and
-- idempotent — safe to run more than once.
--
-- WHAT THIS ADDS
--   A capability (catalog_capabilities) can now carry up to 5 "competency
--   units" — finer-grained sub-items describing the capability. They are
--   stored inline as a JSONB array on the capability row (no extra table),
--   mirroring how custom_rubric / snapshot_rubric are stored elsewhere.
--
-- SHAPE of competency_units (validated in the application layer, max 5):
--   [
--     { "title": "REST endpoint design", "summary": "optional description" },
--     { "title": "Idempotency & retries" }
--   ]
--
-- The cap of 5 items is enforced in the Zod DTO (CapabilityInputSchema), not
-- in the database, so the column itself accepts any JSON array.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE catalog_capabilities
  ADD COLUMN IF NOT EXISTS competency_units JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill any pre-existing rows (the DEFAULT covers new rows; this is
-- belt-and-braces for rows created before the column existed).
UPDATE catalog_capabilities
  SET competency_units = '[]'::jsonb
  WHERE competency_units IS NULL;
