-- ============================================================================
-- Hack51 — Migration 002: Employer proposals + per-request rubric overrides
-- ============================================================================
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql is already in
-- place. This migration is fully additive — no existing rows are rewritten.
--
-- It adds:
--   1. Proposal workflow columns on `catalog_roles` and `challenges`:
--        status         ('approved' | 'pending' | 'rejected') default 'approved'
--        proposed_by    uuid — employer id when the row was proposed by an
--                       employer (NULL when created by admin)
--        reviewed_by    uuid — admin id who approved/rejected
--        reviewed_at    timestamptz
--        reject_reason  text
--
--      All existing rows get status='approved' so current flows keep working.
--
--   2. `custom_rubric` JSONB column on `job_requests` for per-request rubric
--      overrides (Concept Note §6.2: "employer customizes the challenge brief
--      and rubric before publishing"). When NULL, use the challenge's default
--      rubric. When set, this overrides it and is snapshotted into
--      snapshot_rubric at publish time.
-- ============================================================================

-- ─── 1. Proposal-status enum (shared by roles + challenges) ──────────────────
DO $$ BEGIN
  CREATE TYPE proposal_status_enum AS ENUM ('approved', 'pending', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. catalog_roles: add proposal columns ──────────────────────────────────
ALTER TABLE catalog_roles
  ADD COLUMN IF NOT EXISTS status        proposal_status_enum NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS proposed_by   UUID                 REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by   UUID                 REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_catalog_roles_status       ON catalog_roles (status);
CREATE INDEX IF NOT EXISTS idx_catalog_roles_proposed_by  ON catalog_roles (proposed_by) WHERE proposed_by IS NOT NULL;

-- ─── 3. challenges: add proposal columns ─────────────────────────────────────
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS status        proposal_status_enum NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS proposed_by   UUID                 REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by   UUID                 REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_challenges_status       ON challenges (status);
CREATE INDEX IF NOT EXISTS idx_challenges_proposed_by  ON challenges (proposed_by) WHERE proposed_by IS NOT NULL;

-- ─── 4. job_requests: add per-request rubric override (B3) ───────────────────
-- Shape:
--   [
--     { "title": "Code Quality",       "description": "...", "weight": 30, "sort_order": 0 },
--     { "title": "Code Technicality",  "description": "...", "weight": 30, "sort_order": 1 },
--     { "title": "Code Functionality", "description": "...", "weight": 40, "sort_order": 2 }
--   ]
-- Weights must sum to 100 (validated in the application layer). When NULL,
-- the challenge's default rubric is used.

ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS custom_rubric JSONB;

-- ─── 5. Backfill: any existing rows explicitly marked approved ───────────────
-- (Defaults cover new columns, this is belt-and-braces for any row inserted
-- between schema change and migration commit in weird migration orders.)
UPDATE catalog_roles SET status = 'approved' WHERE status IS NULL;
UPDATE challenges    SET status = 'approved' WHERE status IS NULL;

-- ─── 6. Disable RLS on unchanged semantics ───────────────────────────────────
-- (No new tables introduced; existing tables already have RLS disabled.)
