ALTER TABLE "content_emotion_reaction"
DROP CONSTRAINT IF EXISTS "content_emotion_reaction_emotion_check";

ALTER TABLE "content_emotion_reaction"
ADD CONSTRAINT "content_emotion_reaction_emotion_check"
    CHECK ("emotion" IN ('funny', 'scary', 'emotional', 'exciting', 'relaxing', 'thoughtful', 'romantic', 'inspiring'));
