-- ============================================================
-- ContractIQ — Production Database Schema
-- ============================================================
-- How to run:
--   1. Open your Supabase project → SQL Editor
--   2. Paste this entire file and click "Run"
--   3. This script is idempotent — safe to re-run on an existing
--      database. Policies are dropped and recreated each time.
--
-- Requires: PostgreSQL 15 (Supabase default)
--
-- Storage path convention (within the 'contracts' bucket):
--   {user_id}/{contract_id}/{filename}.pdf
--   The bucket name is NOT repeated in the path.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TABLES
-- Created in FK dependency order.
-- ============================================================

-- ------------------------------------------------------------
-- contracts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name        text        NOT NULL,
  contract_type    text        NOT NULL CHECK (contract_type IN ('nda', 'msa')),
  contract_text    text        NOT NULL,
  file_path        text,
  page_count       integer     NOT NULL,
  token_count      integer     NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.contracts                   IS 'Uploaded contracts with extracted text and processing status';
COMMENT ON COLUMN public.contracts.contract_text     IS 'Full text with [PAGE N] markers; single source of truth for AI pipelines';
COMMENT ON COLUMN public.contracts.file_path         IS 'Storage path within contracts bucket: {user_id}/{id}/{filename}.pdf; null if Storage upload failed';
COMMENT ON COLUMN public.contracts.last_accessed_at  IS 'Updated on each /contracts/[id] page visit; drives 90-day retention policy';


-- ------------------------------------------------------------
-- key_terms
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.key_terms (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      uuid           NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id          uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_name        text           NOT NULL,
  value            text           NOT NULL,
  ai_value         text,
  page_number      integer        NOT NULL,
  confidence_score numeric(5, 2)  NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  source_sentence  text           NOT NULL,
  is_manual        boolean        NOT NULL DEFAULT false,
  is_edited        boolean        NOT NULL DEFAULT false,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.key_terms.ai_value   IS 'Original AI-extracted value, preserved on the first user edit';
COMMENT ON COLUMN public.key_terms.is_manual  IS 'true for user-defined custom terms requested before processing';
COMMENT ON COLUMN public.key_terms.is_edited  IS 'true after the user edits the value inline';


-- ------------------------------------------------------------
-- custom_key_terms
-- User-defined terms staged before AI extraction.
-- After extraction these become key_terms rows with is_manual = true.
-- Max 5 per contract enforced at API level.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_key_terms (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_name   text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.custom_key_terms IS 'User-defined terms staged before AI extraction; max 5 per contract (enforced in API, not DB)';


-- ------------------------------------------------------------
-- chat_sessions
-- One session per contract (UNIQUE constraint on contract_id).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id)
);

COMMENT ON TABLE public.chat_sessions IS 'One chat session per contract; the UNIQUE constraint on contract_id enforces this';


-- ------------------------------------------------------------
-- chat_messages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- user_feedback
-- Thumbs up/down + optional comment; one row per user per contract.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      text        NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, user_id)
);

COMMENT ON COLUMN public.user_feedback.comment IS 'Optional free-text comment; max 2000 chars enforced at API level';


-- ------------------------------------------------------------
-- rate_limit_events
-- Sliding-window rate limiting; one row per AI API call per user.
-- Rows older than 2 hours are pruned by the API on each check.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rate_limit_events IS 'Sliding-window rate limit log; pruned to the last 2 hours per user/endpoint on each API call';


-- ============================================================
-- INDEXES
-- ============================================================

-- contracts — dashboard list query: user + date desc
CREATE INDEX IF NOT EXISTS idx_contracts_user_id
  ON public.contracts (user_id);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id_created_at
  ON public.contracts (user_id, created_at DESC);

-- key_terms
CREATE INDEX IF NOT EXISTS idx_key_terms_contract_id
  ON public.key_terms (contract_id);

CREATE INDEX IF NOT EXISTS idx_key_terms_user_id
  ON public.key_terms (user_id);

-- custom_key_terms
CREATE INDEX IF NOT EXISTS idx_custom_key_terms_contract_id
  ON public.custom_key_terms (contract_id);

-- chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_contract_id
  ON public.chat_sessions (contract_id);

-- chat_messages — fetched ascending by created_at
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_created_at
  ON public.chat_messages (session_id, created_at ASC);

-- user_feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_contract_id
  ON public.user_feedback (contract_id);

-- rate_limit_events — sliding-window COUNT query + pruning DELETE
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_user_endpoint_created
  ON public.rate_limit_events (user_id, endpoint, created_at DESC);


-- ============================================================
-- ROW LEVEL SECURITY — enable on all tables
-- ============================================================

ALTER TABLE public.contracts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_terms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_key_terms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS POLICIES
-- Dropped before creation so this script is idempotent.
-- Pattern: each user can only access rows where user_id = auth.uid()
-- ============================================================

-- ------------------------------------------------------------
-- contracts
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own contracts"   ON public.contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON public.contracts;

CREATE POLICY "Users can view own contracts"
  ON public.contracts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts"
  ON public.contracts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts"
  ON public.contracts FOR DELETE
  USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- key_terms
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own key_terms"   ON public.key_terms;
DROP POLICY IF EXISTS "Users can insert own key_terms" ON public.key_terms;
DROP POLICY IF EXISTS "Users can update own key_terms" ON public.key_terms;
DROP POLICY IF EXISTS "Users can delete own key_terms" ON public.key_terms;

CREATE POLICY "Users can view own key_terms"
  ON public.key_terms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own key_terms"
  ON public.key_terms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own key_terms"
  ON public.key_terms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own key_terms"
  ON public.key_terms FOR DELETE
  USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- custom_key_terms
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own custom_key_terms"   ON public.custom_key_terms;
DROP POLICY IF EXISTS "Users can insert own custom_key_terms" ON public.custom_key_terms;
DROP POLICY IF EXISTS "Users can delete own custom_key_terms" ON public.custom_key_terms;

CREATE POLICY "Users can view own custom_key_terms"
  ON public.custom_key_terms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom_key_terms"
  ON public.custom_key_terms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom_key_terms"
  ON public.custom_key_terms FOR DELETE
  USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- chat_sessions
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own chat_sessions"   ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat_sessions" ON public.chat_sessions;

CREATE POLICY "Users can view own chat_sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat_sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ------------------------------------------------------------
-- chat_messages
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own chat_messages"   ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat_messages" ON public.chat_messages;

CREATE POLICY "Users can view own chat_messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ------------------------------------------------------------
-- user_feedback
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own feedback"   ON public.user_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.user_feedback;

CREATE POLICY "Users can view own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ------------------------------------------------------------
-- rate_limit_events
-- DELETE is required so the API can prune rows older than 2 hours.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own rate_limit_events"   ON public.rate_limit_events;
DROP POLICY IF EXISTS "Users can insert own rate_limit_events" ON public.rate_limit_events;
DROP POLICY IF EXISTS "Users can delete own rate_limit_events" ON public.rate_limit_events;

CREATE POLICY "Users can view own rate_limit_events"
  ON public.rate_limit_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate_limit_events"
  ON public.rate_limit_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rate_limit_events"
  ON public.rate_limit_events FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- STORAGE — contracts bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contracts',
  'contracts',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- STORAGE RLS POLICIES
--
-- Path pattern within the 'contracts' bucket:
--   {user_id}/{contract_id}/{filename}.pdf
--
-- storage.foldername(name) splits the object path by '/' and
-- returns an array of the directory segments (excluding the filename).
-- For path '{user_id}/{contract_id}/file.pdf' the array is:
--   [1] = '{user_id}'   ← we check this against auth.uid()
--   [2] = '{contract_id}'
--
-- NOTE: Do NOT include the bucket name ('contracts') in the upload
-- path — that would shift the array index to [2]. The application
-- upload path must be: `${userId}/${contractId}/${fileName}`
-- when calling .from('contracts').upload(...)
-- ============================================================

DROP POLICY IF EXISTS "Users can upload own contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own contract PDFs"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own contract PDFs" ON storage.objects;

CREATE POLICY "Users can upload own contract PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own contract PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own contract PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying the schema to confirm setup.
-- ============================================================

-- All 7 tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'contracts', 'key_terms', 'custom_key_terms',
    'chat_sessions', 'chat_messages', 'user_feedback', 'rate_limit_events'
  )
ORDER BY table_name;

-- RLS enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'contracts', 'key_terms', 'custom_key_terms',
    'chat_sessions', 'chat_messages', 'user_feedback', 'rate_limit_events'
  )
ORDER BY tablename;

-- Policy count per table (should be ≥ 2 for each)
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Storage bucket exists and is private
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'contracts';

-- Storage policies (should be 3 rows)
SELECT name, operation
FROM storage.policies
WHERE bucket_id = 'contracts'
ORDER BY operation;
