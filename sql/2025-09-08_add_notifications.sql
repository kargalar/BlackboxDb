-- ===========================================
-- MIGRATION: Notifications (basic)
-- ===========================================

-- Lookup for notification types
CREATE TABLE IF NOT EXISTS public.notification_type_lookup (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Seed basic types
INSERT INTO public.notification_type_lookup (id, name)
VALUES
    (1, 'REVIEW_LIKED'),
    (2, 'FOLLOWED_YOU')
ON CONFLICT (id) DO NOTHING;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notification (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    type_id INTEGER NOT NULL REFERENCES public.notification_type_lookup(id) ON DELETE RESTRICT,
    review_id INTEGER NULL REFERENCES public.review(id) ON DELETE CASCADE,
    reply_id INTEGER NULL REFERENCES public.review_replies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_recipient ON public.notification(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_unread ON public.notification(recipient_user_id, read_at);

-- RLS (disabled for development consistency)
ALTER TABLE public.notification DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_type_lookup DISABLE ROW LEVEL SECURITY;

-- Function: create notification when a review is liked
CREATE OR REPLACE FUNCTION public.trg_create_notification_on_review_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recipient UUID;
    v_actor UUID;
BEGIN
    -- Actor is the user who liked
    v_actor := NEW.user_id;

    -- Recipient is the review's author
    SELECT r.user_id INTO v_recipient FROM public.review r WHERE r.id = NEW.review_id;

    -- Avoid self notifications or missing review
    IF v_recipient IS NULL OR v_recipient = v_actor THEN
        RETURN NEW;
    END IF;

    -- Insert notification (type: REVIEW_LIKED = 1)
    INSERT INTO public.notification (
        recipient_user_id,
        actor_user_id,
        type_id,
        review_id,
        created_at
    ) VALUES (
        v_recipient,
        v_actor,
        1,
        NEW.review_id,
        now()
    );

    RETURN NEW;
END;
$$;

-- Trigger on review_likes insert
DROP TRIGGER IF EXISTS after_review_like_insert ON public.review_likes;
CREATE TRIGGER after_review_like_insert
AFTER INSERT ON public.review_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_create_notification_on_review_like();

-- Function: create notification when followed
CREATE OR REPLACE FUNCTION public.trg_create_notification_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Avoid self follow (already prevented by CHECK), but guard anyway
    IF NEW.user_id = NEW.following_user_id THEN
        RETURN NEW;
    END IF;

    -- Insert notification (type: FOLLOWED_YOU = 2)
    INSERT INTO public.notification (
        recipient_user_id,
        actor_user_id,
        type_id,
        created_at
    ) VALUES (
        NEW.following_user_id,
        NEW.user_id,
        2,
        now()
    );

    RETURN NEW;
END;
$$;

-- Trigger on user_follow insert
DROP TRIGGER IF EXISTS after_user_follow_insert ON public.user_follow;
CREATE TRIGGER after_user_follow_insert
AFTER INSERT ON public.user_follow
FOR EACH ROW EXECUTE FUNCTION public.trg_create_notification_on_follow();

-- Grants for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification TO authenticated;
GRANT SELECT ON public.notification_type_lookup TO authenticated;
GRANT USAGE ON SEQUENCE notification_id_seq TO authenticated;
