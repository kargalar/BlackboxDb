-- ===========================================
-- MIGRATION: Roles & Content Requests + Moderation & Notifications
-- Date: 2025-09-09
-- ===========================================

-- 1) User roles on app_user (admin / moderator)
ALTER TABLE IF EXISTS public.app_user
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_moderator boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.app_user.is_admin IS 'User has full administrative privileges.';
COMMENT ON COLUMN public.app_user.is_moderator IS 'User has moderation privileges (limited admin).';

-- Guard helper functions
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.app_user au WHERE au.auth_user_id = p_user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.is_moderator(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((SELECT is_moderator FROM public.app_user au WHERE au.auth_user_id = p_user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.is_privileged(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.is_admin(p_user_id) OR public.is_moderator(p_user_id);
$$;
GRANT EXECUTE ON FUNCTION public.is_privileged(uuid) TO authenticated;

-- 2) Content request workflow tables
CREATE TABLE IF NOT EXISTS public.content_request_status_lookup (
  id SERIAL PRIMARY KEY,
  name varchar(32) UNIQUE NOT NULL
);

INSERT INTO public.content_request_status_lookup (id, name) VALUES
  (1, 'PENDING'),
  (2, 'APPROVED'),
  (3, 'REJECTED')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS public.content_request (
  id SERIAL PRIMARY KEY,
  requester_user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type_id integer NOT NULL REFERENCES public.content_type_lookup(id) ON DELETE RESTRICT,
  release_date date NULL,
  year integer NULL,
  duration_minutes integer NULL,
  description text NULL,
  poster_path text NULL,
  external_ids jsonb NULL,
  details jsonb NULL,
  status_id integer NOT NULL DEFAULT 1 REFERENCES public.content_request_status_lookup(id) ON DELETE RESTRICT,
  admin_user_id UUID NULL REFERENCES public.app_user(auth_user_id) ON DELETE SET NULL,
  rejection_reason text NULL,
  decided_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_request_requester ON public.content_request(requester_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_request_status ON public.content_request(status_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_request_updated_at ON public.content_request;
CREATE TRIGGER trg_content_request_updated_at
BEFORE UPDATE ON public.content_request
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3) RLS for content_request (lookup has RLS disabled)
ALTER TABLE public.content_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_request_status_lookup DISABLE ROW LEVEL SECURITY;

-- Requester can view own requests
DROP POLICY IF EXISTS "Requester can view own content requests" ON public.content_request;
CREATE POLICY "Requester can view own content requests" ON public.content_request
  FOR SELECT USING (auth.uid() = requester_user_id OR public.is_privileged(auth.uid()));

-- Requester can insert own requests
DROP POLICY IF EXISTS "Requester can insert content requests" ON public.content_request;
CREATE POLICY "Requester can insert content requests" ON public.content_request
  FOR INSERT WITH CHECK (auth.uid() = requester_user_id);

-- Requester can edit own pending requests (not status fields)
DROP POLICY IF EXISTS "Requester can update own pending content requests" ON public.content_request;
CREATE POLICY "Requester can update own pending content requests" ON public.content_request
  FOR UPDATE USING (
    auth.uid() = requester_user_id AND status_id = 1 -- PENDING
  ) WITH CHECK (
    auth.uid() = requester_user_id AND status_id = 1
  );

-- Admin/Moderator can view/update/delete any request
DROP POLICY IF EXISTS "Privileged can manage any content request" ON public.content_request;
CREATE POLICY "Privileged can manage any content request" ON public.content_request
  USING (public.is_privileged(auth.uid()))
  WITH CHECK (public.is_privileged(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_request TO authenticated;
GRANT SELECT ON public.content_request_status_lookup TO authenticated;

-- 4) Notifications: add types for content request results and comment removal
-- Ensure notification type lookup exists (migration 2025-09-08_add_notifications.sql)
CREATE TABLE IF NOT EXISTS public.notification_type_lookup (
  id SERIAL PRIMARY KEY,
  name varchar(50) UNIQUE NOT NULL
);

INSERT INTO public.notification_type_lookup (id, name) VALUES
  (3, 'CONTENT_APPROVED'),
  (4, 'CONTENT_REJECTED'),
  (5, 'COMMENT_REMOVED')
ON CONFLICT (id) DO NOTHING;

-- 5) Admin/Moderator management policies
-- Content: enable RLS and allow everyone to view, only privileged to modify
ALTER TABLE IF EXISTS public.content ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'content' AND policyname = 'Anyone can view content'
  ) THEN
    CREATE POLICY "Anyone can view content" ON public.content
      FOR SELECT USING (true);
  END IF;
END $$;

DROP POLICY IF EXISTS "Privileged can manage content" ON public.content;
CREATE POLICY "Privileged can manage content" ON public.content
  FOR ALL USING (public.is_privileged(auth.uid()))
  WITH CHECK (public.is_privileged(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content TO authenticated;

-- Reviews: allow privileged to delete any review
DROP POLICY IF EXISTS "Privileged can delete any review" ON public.review;
CREATE POLICY "Privileged can delete any review" ON public.review
  FOR DELETE USING (public.is_privileged(auth.uid()));

-- App users: allow privileged to view, update roles, and delete any user profile rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_user' AND policyname = 'Privileged can view all app users'
  ) THEN
    CREATE POLICY "Privileged can view all app users" ON public.app_user
      FOR SELECT USING (public.is_privileged(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Privileged can update any app user" ON public.app_user;
CREATE POLICY "Privileged can update any app user" ON public.app_user
  FOR UPDATE USING (public.is_privileged(auth.uid()))
  WITH CHECK (public.is_privileged(auth.uid()));

DROP POLICY IF EXISTS "Privileged can delete any app user" ON public.app_user;
CREATE POLICY "Privileged can delete any app user" ON public.app_user
  FOR DELETE USING (public.is_privileged(auth.uid()));

-- 5) Approval/rejection functions (SECURITY DEFINER)
-- Approve a content request: creates content row, updates request, and notifies requester
CREATE OR REPLACE FUNCTION public.approve_content_request(p_request_id integer, p_admin_id uuid)
RETURNS integer -- returns new content.id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req record;
  v_content_id integer;
  v_release_date date;
BEGIN
  SELECT * INTO v_req FROM public.content_request WHERE id = p_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'content_request % not found', p_request_id USING ERRCODE = 'NO_DATA_FOUND';
  END IF;

  IF v_req.status_id <> 1 THEN -- PENDING
    RAISE EXCEPTION 'content_request % is not pending', p_request_id;
  END IF;

  -- Prefer year over release_date if provided
  v_release_date := COALESCE(v_req.release_date, CASE WHEN v_req.year IS NOT NULL THEN make_date(v_req.year, 1, 1) END);

  -- Insert content (basic fields + duration)
  INSERT INTO public.content (title, content_type_id, release_date, description, poster_path, length)
  VALUES (v_req.title, v_req.content_type_id, v_release_date, v_req.description, v_req.poster_path, v_req.duration_minutes)
  RETURNING id INTO v_content_id;

  -- Mark request as approved
  UPDATE public.content_request
    SET status_id = 2, -- APPROVED
        admin_user_id = p_admin_id,
        decided_at = now(),
        rejection_reason = NULL
  WHERE id = p_request_id;

  -- Notify requester
  INSERT INTO public.notification (recipient_user_id, actor_user_id, type_id, created_at)
  VALUES (v_req.requester_user_id, p_admin_id, 3, now()); -- CONTENT_APPROVED

  RETURN v_content_id;
END;
$$;

-- Reject a content request with optional reason
CREATE OR REPLACE FUNCTION public.reject_content_request(p_request_id integer, p_admin_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req record;
BEGIN
  SELECT * INTO v_req FROM public.content_request WHERE id = p_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'content_request % not found', p_request_id USING ERRCODE = 'NO_DATA_FOUND';
  END IF;

  IF v_req.status_id <> 1 THEN -- PENDING
    RAISE EXCEPTION 'content_request % is not pending', p_request_id;
  END IF;

  UPDATE public.content_request
    SET status_id = 3, -- REJECTED
        admin_user_id = p_admin_id,
        decided_at = now(),
        rejection_reason = p_reason
  WHERE id = p_request_id;

  -- Notify requester
  INSERT INTO public.notification (recipient_user_id, actor_user_id, type_id, created_at)
  VALUES (v_req.requester_user_id, p_admin_id, 4, now()); -- CONTENT_REJECTED
END;
$$;

-- Allow authenticated to call the RPCs; RLS in content_request restricts who can change
GRANT EXECUTE ON FUNCTION public.approve_content_request(integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_content_request(integer, uuid, text) TO authenticated;

-- 6) Moderation: allow privileged users to delete any review replies
-- Ensure RLS is enabled for review_replies in production-like env
ALTER TABLE IF EXISTS public.review_replies ENABLE ROW LEVEL SECURITY;

-- If review_comment table exists, enable RLS and add delete policies
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='review_comment'
  ) THEN
    ALTER TABLE public.review_comment ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Privileged can delete any review comment" ON public.review_comment;
    CREATE POLICY "Privileged can delete any review comment" ON public.review_comment
      FOR DELETE USING (public.is_privileged(auth.uid()));
  END IF;
END $$;

-- Authors can delete their own replies (if such policy doesn't exist yet)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'review_replies' AND policyname = 'Users can delete own review replies'
  ) THEN
    CREATE POLICY "Users can delete own review replies" ON public.review_replies
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "Privileged can delete any review reply" ON public.review_replies;
CREATE POLICY "Privileged can delete any review reply" ON public.review_replies
  FOR DELETE USING (public.is_privileged(auth.uid()));

  -- Ensure authenticated role can execute operations, RLS will restrict
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_replies TO authenticated;
  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='review_comment'
    ) THEN
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_comment TO authenticated;
    END IF;
  END $$;

-- Optional: when a moderator deletes a comment, notify the author (soft notice)
-- This can be implemented at application level; DB-level trigger is omitted to avoid noisy notifications.
