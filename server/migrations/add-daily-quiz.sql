CREATE TABLE IF NOT EXISTS daily_quiz (date TEXT PRIMARY KEY, session JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS daily_quiz_attempt (
  id SERIAL PRIMARY KEY, date TEXT NOT NULL REFERENCES daily_quiz(date),
  user_id UUID NOT NULL REFERENCES app_user(auth_user_id) ON DELETE CASCADE,
  UNIQUE(date, user_id)
);
CREATE TABLE IF NOT EXISTS daily_quiz_leaderboard (
  id SERIAL PRIMARY KEY, user_id UUID NOT NULL UNIQUE REFERENCES app_user(auth_user_id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0, total_quizzes INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0, total_questions INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0
);
