-- ======================================
-- Screenshot Quiz System Migration
-- ======================================

-- Ekran görüntüleri tablosu
CREATE TABLE IF NOT EXISTS content_screenshot (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
    "order" INTEGER DEFAULT 0,
    description TEXT,
    is_enabled_for_quiz BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_screenshot_content_id ON content_screenshot(content_id);
CREATE INDEX IF NOT EXISTS idx_content_screenshot_quiz_enabled ON content_screenshot(is_enabled_for_quiz);
CREATE INDEX IF NOT EXISTS idx_content_screenshot_difficulty ON content_screenshot(difficulty);

-- Quiz ayarları tablosu
CREATE TABLE IF NOT EXISTS quiz_settings (
    id SERIAL PRIMARY KEY,
    content_type_id INTEGER UNIQUE NOT NULL REFERENCES content_type_lookup(id),
    is_active BOOLEAN DEFAULT TRUE,
    time_per_question INTEGER DEFAULT 30,
    questions_count INTEGER DEFAULT 10,
    points_easy INTEGER DEFAULT 10,
    points_medium INTEGER DEFAULT 25,
    points_hard INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz sonuçları tablosu
CREATE TABLE IF NOT EXISTS quiz_result (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(auth_user_id) ON DELETE CASCADE,
    content_type_id INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_questions INTEGER NOT NULL,
    time_taken INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_result_user_id ON quiz_result(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_result_content_type ON quiz_result(content_type_id);
CREATE INDEX IF NOT EXISTS idx_quiz_result_score ON quiz_result(score);
CREATE INDEX IF NOT EXISTS idx_quiz_result_created_at ON quiz_result(created_at);

-- Liderlik tablosu
CREATE TABLE IF NOT EXISTS quiz_leaderboard (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(auth_user_id) ON DELETE CASCADE,
    content_type_id INTEGER NOT NULL,
    total_score INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, content_type_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_leaderboard_content_type ON quiz_leaderboard(content_type_id);
CREATE INDEX IF NOT EXISTS idx_quiz_leaderboard_total_score ON quiz_leaderboard(total_score);

-- Varsayılan quiz ayarlarını oluştur
INSERT INTO quiz_settings (content_type_id, is_active, time_per_question, questions_count, points_easy, points_medium, points_hard)
SELECT id, true, 30, 10, 10, 25, 50 
FROM content_type_lookup
ON CONFLICT (content_type_id) DO NOTHING;

-- Updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ları oluştur
DROP TRIGGER IF EXISTS update_content_screenshot_updated_at ON content_screenshot;
CREATE TRIGGER update_content_screenshot_updated_at
    BEFORE UPDATE ON content_screenshot
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_settings_updated_at ON quiz_settings;
CREATE TRIGGER update_quiz_settings_updated_at
    BEFORE UPDATE ON quiz_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_leaderboard_updated_at ON quiz_leaderboard;
CREATE TRIGGER update_quiz_leaderboard_updated_at
    BEFORE UPDATE ON quiz_leaderboard
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
