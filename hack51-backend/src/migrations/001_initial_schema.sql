-- ================================================================
-- Hack51 — Complete Supabase Migration
-- HOW TO USE:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire file and click "Run"
--   3. Done. All tables, indexes, triggers, and seed data created.
--
-- To reset cleanly, run 000_drop_all.sql first (provided below
-- as a comment block at the bottom of this file).
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'candidate',
    'employer',
    'admin_reviewer',
    'admin_lead',
    'system_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE otp_purpose AS ENUM (
    'email_verification',
    'password_reset',
    'login_mfa'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE team_size_enum AS ENUM (
    '1-10', '11-50', '51-200', '201-500', '500+'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM (
    'pending', 'success', 'failed', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_status_enum AS ENUM (
    'draft', 'published', 'evaluating', 'shortlisted', 'closed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE submission_status_enum AS ENUM (
    'submitted', 'under_review', 'returned', 'scored', 'shortlisted', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE triage_decision_enum AS ENUM (
    'valid', 'invalid', 'returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── CORE: USERS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          user_role   NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  avatar_url    TEXT,
  is_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  last_login_ip TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUTH: OTPS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS otps (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash   TEXT        NOT NULL,
  purpose    otp_purpose NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUTH: REFRESH TOKENS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,
  jti        TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EMPLOYER: WORKSPACES ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workspaces (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID             NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT,
  company_url  TEXT,
  industry     TEXT,
  team_size    team_size_enum,
  logo_url     TEXT,
  description  TEXT,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ─── CANDIDATE: PROFILES ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_profiles (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio              TEXT,
  skills           TEXT[]      DEFAULT '{}',
  experience_years INTEGER     CHECK (experience_years >= 0 AND experience_years <= 50),
  location         TEXT,
  linkedin_url     TEXT,
  portfolio_url    TEXT,
  is_available     BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── JOB REQUESTS (Employer posts a challenge request) ───────────────────────

CREATE TABLE IF NOT EXISTS job_requests (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID                NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employer_id       UUID                NOT NULL REFERENCES users(id),
  title             TEXT                NOT NULL,
  description       TEXT,
  role_name         TEXT                NOT NULL,
  status            request_status_enum NOT NULL DEFAULT 'draft',
  challenge_cap     INTEGER             NOT NULL DEFAULT 10 CHECK (challenge_cap > 0),
  shortlist_size    INTEGER             NOT NULL DEFAULT 3 CHECK (shortlist_size > 0),
  deadline          TIMESTAMPTZ,
  deposit_amount    NUMERIC(12,2),
  final_charge      NUMERIC(12,2),
  published_at      TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ─── SUBMISSIONS (Candidate submits to a job request) ────────────────────────

CREATE TABLE IF NOT EXISTS submissions (
  id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id  UUID                    NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
  candidate_id    UUID                    NOT NULL REFERENCES users(id),
  status          submission_status_enum  NOT NULL DEFAULT 'submitted',
  artifact_urls   TEXT[]                  DEFAULT '{}',
  notes           TEXT,
  submitted_at    TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  score           NUMERIC(5,2),
  reviewer_notes  TEXT,
  triage_decision triage_decision_enum,
  triage_reason   TEXT,
  created_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  UNIQUE(job_request_id, candidate_id)
);

-- ─── SHORTLIST (Top N candidates per request) ────────────────────────────────

CREATE TABLE IF NOT EXISTS shortlists (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id UUID        NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
  candidate_id   UUID        NOT NULL REFERENCES users(id),
  submission_id  UUID        NOT NULL REFERENCES submissions(id),
  rank           INTEGER     NOT NULL,
  confirmed_by   UUID        REFERENCES users(id),
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_request_id, candidate_id)
);

-- ─── PAYMENTS (Paystack integration — stub ready, not active) ────────────────
-- payment_reference  = Paystack transaction reference
-- paystack_id        = Paystack internal transaction ID (returned after verification)
-- metadata           = JSON blob for any extra Paystack data

CREATE TABLE IF NOT EXISTS payments (
  id                  UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID                 NOT NULL REFERENCES users(id),
  job_request_id      UUID                 REFERENCES job_requests(id),
  amount              NUMERIC(12,2)        NOT NULL CHECK (amount > 0),
  currency            TEXT                 NOT NULL DEFAULT 'NGN',
  status              payment_status_enum  NOT NULL DEFAULT 'pending',
  payment_reference   TEXT                 UNIQUE,
  paystack_id         TEXT,
  payment_type        TEXT                 NOT NULL DEFAULT 'deposit',
  metadata            JSONB                DEFAULT '{}',
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'info',
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOG ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  entity     TEXT        NOT NULL,
  entity_id  TEXT,
  metadata   JSONB       DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email               ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role                ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active              ON users (is_active);
CREATE INDEX IF NOT EXISTS idx_otps_user_purpose         ON otps (user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_otps_expires              ON otps (expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti        ON refresh_tokens (jti);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user       ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner          ON workspaces (owner_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user   ON candidate_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_workspace    ON job_requests (workspace_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_employer     ON job_requests (employer_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_status       ON job_requests (status);
CREATE INDEX IF NOT EXISTS idx_submissions_request       ON submissions (job_request_id);
CREATE INDEX IF NOT EXISTS idx_submissions_candidate     ON submissions (candidate_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status        ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_shortlists_request        ON shortlists (job_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_user             ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference        ON payments (payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status           ON payments (status);
CREATE INDEX IF NOT EXISTS idx_notifications_user        ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read        ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor          ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity         ON audit_logs (entity, entity_id);

-- ─── AUTO updated_at TRIGGER ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'workspaces', 'candidate_profiles',
    'job_requests', 'submissions', 'payments'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ─── DISABLE RLS (backend-only access via service role key) ──────────────────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'otps', 'refresh_tokens', 'workspaces', 'candidate_profiles',
    'job_requests', 'submissions', 'shortlists', 'payments',
    'notifications', 'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %s DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ─── SEED: SYSTEM ADMIN ACCOUNT ───────────────────────────────────────────────
-- Default credentials:
--   Email:    admin@hack51.com
--   Password: Admin@Hack51!
--
-- ⚠️  CHANGE THIS PASSWORD IMMEDIATELY after first login via:
--   POST /admin/auth/forgot-password  →  POST /auth/verify-reset-otp  →  POST /auth/reset-password
--
-- Hash below is bcrypt of "Admin@Hack51!" with 12 rounds.
-- Generated with: node -e "const b=require('bcryptjs');b.hash('Admin@Hack51!',12).then(console.log)"

INSERT INTO users (email, password_hash, role, first_name, last_name, is_verified, is_active)
VALUES (
  'admin@hack51.com',
  '$2b$12$Ehcy8PpOsiY0.Bquc1Boxun0UbI5WM2YakyaV/xwSkgD3JzBKix52',
  'system_admin',
  'System',
  'Admin',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ─── CLEANUP FUNCTION ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM otps
    WHERE expires_at < NOW() - INTERVAL '1 day' AND used_at IS NULL;
  DELETE FROM refresh_tokens
    WHERE (expires_at < NOW() OR revoked_at IS NOT NULL)
      AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- ─── COMMENTS ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE users              IS 'All platform users across all roles';
COMMENT ON TABLE otps               IS 'SHA-256 hashed 6-digit OTP codes';
COMMENT ON TABLE refresh_tokens     IS 'Rotating JWT refresh tokens with revocation';
COMMENT ON TABLE workspaces         IS 'One workspace per employer account';
COMMENT ON TABLE candidate_profiles IS 'Extended profile data for candidates';
COMMENT ON TABLE job_requests       IS 'Employer challenge requests (the hiring campaigns)';
COMMENT ON TABLE submissions        IS 'Candidate submissions against job requests';
COMMENT ON TABLE shortlists         IS 'Top-N confirmed shortlisted candidates per request';
COMMENT ON TABLE payments           IS 'Paystack payment records (stub — integration pending)';
COMMENT ON TABLE notifications      IS 'In-app notifications for all users';
COMMENT ON TABLE audit_logs         IS 'Immutable audit trail for all sensitive actions';

-- ================================================================
-- RESET SCRIPT — run this FIRST if you need a clean slate:
-- ================================================================
-- DROP TABLE IF EXISTS audit_logs, notifications, payments, shortlists,
--   submissions, job_requests, candidate_profiles, workspaces,
--   refresh_tokens, otps, users CASCADE;
-- DROP TYPE IF EXISTS user_role, otp_purpose, team_size_enum,
--   payment_status_enum, request_status_enum,
--   submission_status_enum, triage_decision_enum CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_expired_records CASCADE;
-- ================================================================

-- ================================================================
-- EXTENSION: Catalog, Requests, Submissions, Scoring, Shortlist
-- Run this block after the initial schema, or include in full reset
-- ================================================================

-- ─── CATALOG: ROLES (role definitions by admin) ───────────────────────────────

CREATE TABLE IF NOT EXISTS catalog_roles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  description   TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by    UUID        NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATALOG: SKILL LEVELS per role ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS catalog_skill_levels (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_role_id UUID        NOT NULL REFERENCES catalog_roles(id) ON DELETE CASCADE,
  level           TEXT        NOT NULL CHECK (level IN ('entry-level','mid-level','senior')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATALOG: CAPABILITIES per role ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS catalog_capabilities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_role_id UUID        NOT NULL REFERENCES catalog_roles(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  summary         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATALOG: CHALLENGES ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenges (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_role_id     UUID        NOT NULL REFERENCES catalog_roles(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  summary             TEXT,
  scenario            TEXT,
  deliverables        TEXT[]      DEFAULT '{}',
  submission_format   TEXT,
  constraints_text    TEXT,
  submission_requirements TEXT,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by          UUID        NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATALOG: RUBRIC CRITERIA per challenge ───────────────────────────────────

CREATE TABLE IF NOT EXISTS rubric_criteria (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID          NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  title         TEXT          NOT NULL,
  description   TEXT,
  weight        INTEGER       NOT NULL CHECK (weight > 0 AND weight <= 100),
  sort_order    INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── JOB REQUESTS (employer's hiring campaign) ───────────────────────────────

DROP TABLE IF EXISTS job_requests CASCADE;
CREATE TABLE IF NOT EXISTS job_requests (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID                 NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employer_id       UUID                 NOT NULL REFERENCES users(id),
  challenge_id      UUID                 REFERENCES challenges(id),
  title             TEXT                 NOT NULL,
  role_type         TEXT                 NOT NULL DEFAULT 'custom',
  role_level        TEXT,
  status            request_status_enum  NOT NULL DEFAULT 'draft',
  challenge_cap     INTEGER              NOT NULL DEFAULT 10,
  shortlist_size    INTEGER              NOT NULL DEFAULT 3,
  deadline          TIMESTAMPTZ,
  admin_fee         NUMERIC(12,2)        NOT NULL DEFAULT 0,
  deposit_amount    NUMERIC(12,2)        NOT NULL DEFAULT 0,
  final_charge      NUMERIC(12,2),
  -- Snapshot fields (locked at publish time)
  snapshot_challenge JSONB,
  snapshot_rubric    JSONB,
  published_at      TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- ─── SUBMISSIONS ──────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS submissions CASCADE;
CREATE TABLE IF NOT EXISTS submissions (
  id                   UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id       UUID                   NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
  candidate_id         UUID                   NOT NULL REFERENCES users(id),
  status               submission_status_enum NOT NULL DEFAULT 'submitted',
  artifact_urls        TEXT[]                 DEFAULT '{}',
  artifact_type        TEXT                   CHECK (artifact_type IN ('link','upload','both')),
  submission_statement TEXT,
  integrity_declared   BOOLEAN                NOT NULL DEFAULT FALSE,
  triage_decision      triage_decision_enum,
  triage_reason        TEXT,
  triaged_by           UUID                   REFERENCES users(id),
  triaged_at           TIMESTAMPTZ,
  reviewer_notes       TEXT,
  total_score          NUMERIC(5,2),
  scored_by            UUID                   REFERENCES users(id),
  scored_at            TIMESTAMPTZ,
  resubmit_count       INTEGER                NOT NULL DEFAULT 0,
  submitted_at         TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  UNIQUE(job_request_id, candidate_id)
);

-- ─── SUBMISSION SCORES (per rubric criterion) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS submission_scores (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  criterion_id    UUID        NOT NULL REFERENCES rubric_criteria(id),
  criterion_title TEXT        NOT NULL,
  weight          INTEGER     NOT NULL,
  score_percent   INTEGER     NOT NULL CHECK (score_percent >= 0 AND score_percent <= 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, criterion_id)
);

-- ─── SHORTLISTS ───────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS shortlists CASCADE;
CREATE TABLE IF NOT EXISTS shortlists (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id  UUID        NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
  candidate_id    UUID        NOT NULL REFERENCES users(id),
  submission_id   UUID        NOT NULL REFERENCES submissions(id),
  rank            INTEGER     NOT NULL,
  total_score     NUMERIC(5,2),
  confirmed_by    UUID        REFERENCES users(id),
  confirmed_at    TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_request_id, candidate_id)
);

-- ─── WALLET / SETTLEMENT RECORDS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settlement_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id  UUID        NOT NULL REFERENCES job_requests(id),
  employer_id     UUID        NOT NULL REFERENCES users(id),
  deposit_paid    NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_charge    NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_returned NUMERIC(12,2) NOT NULL DEFAULT 0,
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ADDITIONAL INDEXES ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_catalog_roles_active      ON catalog_roles (is_active);
CREATE INDEX IF NOT EXISTS idx_challenges_role           ON challenges (catalog_role_id);
CREATE INDEX IF NOT EXISTS idx_challenges_active         ON challenges (is_active);
CREATE INDEX IF NOT EXISTS idx_rubric_challenge          ON rubric_criteria (challenge_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_workspace    ON job_requests (workspace_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_employer     ON job_requests (employer_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_status       ON job_requests (status);
CREATE INDEX IF NOT EXISTS idx_submissions_request       ON submissions (job_request_id);
CREATE INDEX IF NOT EXISTS idx_submissions_candidate     ON submissions (candidate_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status        ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submission_scores_sub     ON submission_scores (submission_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_request        ON shortlists (job_request_id);
CREATE INDEX IF NOT EXISTS idx_settlement_request        ON settlement_records (job_request_id);
CREATE INDEX IF NOT EXISTS idx_settlement_employer       ON settlement_records (employer_id);

-- ─── UPDATED_AT TRIGGERS for new tables ──────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'catalog_roles','challenges','job_requests','submissions'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- Disable RLS on new tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'catalog_roles','catalog_skill_levels','catalog_capabilities',
    'challenges','rubric_criteria','job_requests','submissions',
    'submission_scores','shortlists','settlement_records'
  ] LOOP
    EXECUTE format('ALTER TABLE %s DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ─── RESET SCRIPT (full) ─────────────────────────────────────────────────────
-- Run this to start completely fresh:
--
-- DROP TABLE IF EXISTS
--   audit_logs, notifications, settlement_records, shortlists,
--   submission_scores, submissions, job_requests, rubric_criteria,
--   challenges, catalog_capabilities, catalog_skill_levels,
--   catalog_roles, payments, candidate_profiles, workspaces,
--   refresh_tokens, otps, users CASCADE;
-- DROP TYPE IF EXISTS
--   user_role, otp_purpose, team_size_enum, payment_status_enum,
--   request_status_enum, submission_status_enum, triage_decision_enum CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_expired_records CASCADE;

-- ─── HELPER: increment resubmit count ────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_resubmit_count(submission_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE submissions
  SET resubmit_count = resubmit_count + 1,
      updated_at = NOW()
  WHERE id = submission_id;
END;
$$;
