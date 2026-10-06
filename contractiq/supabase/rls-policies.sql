-- ============================================================
-- ContractIQ — RLS Policies
-- Idempotent: safe to re-run on an existing project.
-- Policies are dropped before recreation.
--
-- For the full schema (tables, indexes, storage bucket) see:
--   database.sql (paste into Supabase SQL Editor)
-- ============================================================


-- ============================================================
-- ROW LEVEL SECURITY — ensure enabled on all tables
-- ============================================================

ALTER TABLE public.contracts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_terms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_key_terms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- contracts
-- ============================================================

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


-- ============================================================
-- key_terms
-- ============================================================

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


-- ============================================================
-- custom_key_terms
-- ============================================================

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


-- ============================================================
-- chat_sessions
-- ============================================================

DROP POLICY IF EXISTS "Users can view own chat_sessions"   ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat_sessions" ON public.chat_sessions;

CREATE POLICY "Users can view own chat_sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat_sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- chat_messages
-- ============================================================

DROP POLICY IF EXISTS "Users can view own chat_messages"   ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat_messages" ON public.chat_messages;

CREATE POLICY "Users can view own chat_messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- user_feedback
-- ============================================================

DROP POLICY IF EXISTS "Users can view own feedback"   ON public.user_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.user_feedback;

CREATE POLICY "Users can view own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- rate_limit_events
--
-- No user-facing policies — RLS is enabled so the anon key has
-- zero access. All reads, inserts, and deletes are performed
-- server-side via createAdminClient() (service role), which bypasses
-- RLS. This prevents users from deleting their own events to evade limits.
-- ============================================================

DROP POLICY IF EXISTS "Users can view own rate_limit_events"   ON public.rate_limit_events;
DROP POLICY IF EXISTS "Users can insert own rate_limit_events" ON public.rate_limit_events;
DROP POLICY IF EXISTS "Users can delete own rate_limit_events" ON public.rate_limit_events;


-- ============================================================
-- STORAGE RLS POLICIES
--
-- Path pattern: {user_id}/{contract_id}/{filename}.pdf
-- (storage.foldername(name))[1] = first path segment = user_id
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
-- VERIFICATION
-- ============================================================

-- All tables should have rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'contracts', 'key_terms', 'custom_key_terms',
    'chat_sessions', 'chat_messages', 'user_feedback', 'rate_limit_events'
  )
ORDER BY tablename;

-- Policy count per table
SELECT tablename, COUNT(*) AS policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
