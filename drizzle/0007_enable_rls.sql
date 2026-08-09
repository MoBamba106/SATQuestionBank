-- Enable RLS on all public tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collection_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "practice_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "practice_test_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_presence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "duels" ENABLE ROW LEVEL SECURITY;

-- Basic Policies: Read access for authenticated users
CREATE POLICY "Allow read access for authenticated users on users" ON "users" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on questions" ON "questions" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on quiz_sessions" ON "quiz_sessions" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on attempts" ON "attempts" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on notes" ON "notes" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on favorites" ON "favorites" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on collections" ON "collections" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on collection_items" ON "collection_items" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on practice_tests" ON "practice_tests" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on practice_test_questions" ON "practice_test_questions" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on feedback" ON "feedback" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on user_presence" ON "user_presence" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on shared_questions" ON "shared_questions" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on shared_collections" ON "shared_collections" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access for authenticated users on duels" ON "duels" FOR SELECT USING (auth.role() = 'authenticated');

-- Restrict write access to resource owners (example based on user_id)
CREATE POLICY "Allow owner to insert quiz_sessions" ON "quiz_sessions" FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to update quiz_sessions" ON "quiz_sessions" FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to delete quiz_sessions" ON "quiz_sessions" FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Allow owner to insert notes" ON "notes" FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to update notes" ON "notes" FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to delete notes" ON "notes" FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Allow owner to insert favorites" ON "favorites" FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to update favorites" ON "favorites" FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to delete favorites" ON "favorites" FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Allow owner to insert collections" ON "collections" FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to update collections" ON "collections" FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to delete collections" ON "collections" FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Allow owner to insert practice_tests" ON "practice_tests" FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to update practice_tests" ON "practice_tests" FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Allow owner to delete practice_tests" ON "practice_tests" FOR DELETE USING (auth.uid()::text = user_id);

-- Create Database Indexes for RLS Optimization
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_tests_user_id ON practice_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_questions_from_user_id ON shared_questions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_questions_to_user_id ON shared_questions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_collections_from_user_id ON shared_collections(from_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_collections_to_user_id ON shared_collections(to_user_id);
CREATE INDEX IF NOT EXISTS idx_duels_host_user_id ON duels(host_user_id);
CREATE INDEX IF NOT EXISTS idx_duels_guest_user_id ON duels(guest_user_id);
