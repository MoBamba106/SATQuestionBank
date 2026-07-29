CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY,
  "email" text,
  "display_name" text,
  "avatar_url" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "users" ("id", "email", "display_name")
VALUES ('guest', null, 'Guest')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
  "id" text PRIMARY KEY,
  "question_text" text NOT NULL DEFAULT '',
  "question_html" text,
  "passage" text,
  "passage_html" text,
  "correct_answer" text NOT NULL,
  "explanation" text,
  "difficulty" text NOT NULL DEFAULT 'Medium',
  "domain" text NOT NULL,
  "skill" text NOT NULL,
  "subskill" text,
  "source" text,
  "type" text NOT NULL DEFAULT 'multiple_choice',
  "choices" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "question_html" text;
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "passage_html" text;
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'multiple_choice';
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "choices" jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_domain_idx" ON "questions" ("domain");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_skill_idx" ON "questions" ("skill");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_difficulty_idx" ON "questions" ("difficulty");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_subskill_idx" ON "questions" ("subskill");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "favorites" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "question_id" text NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "question_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "favorites_user_idx" ON "favorites" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "question_id" text NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "note" text NOT NULL DEFAULT '',
  "updated_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "question_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collections" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "icon" text NOT NULL DEFAULT 'folder',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "icon" text NOT NULL DEFAULT 'folder';
--> statement-breakpoint
UPDATE "collections" SET "user_id" = 'guest' WHERE "user_id" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collections_user_idx" ON "collections" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collection_items" (
  "collection_id" text NOT NULL REFERENCES "collections"("id") ON DELETE CASCADE,
  "question_id" text NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "added_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("collection_id", "question_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quiz_sessions" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "mode" text NOT NULL DEFAULT 'practice',
  "label" text,
  "test_id" text,
  "total_questions" integer NOT NULL DEFAULT 0,
  "correct_count" integer,
  "answered_count" integer,
  "adaptive_path" jsonb,
  "total_score" integer,
  "rw_score" integer,
  "math_score" integer,
  "skill_bands" jsonb,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD COLUMN IF NOT EXISTS "adaptive_path" jsonb;
--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD COLUMN IF NOT EXISTS "total_score" integer;
--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD COLUMN IF NOT EXISTS "rw_score" integer;
--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD COLUMN IF NOT EXISTS "math_score" integer;
--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD COLUMN IF NOT EXISTS "skill_bands" jsonb;
--> statement-breakpoint
UPDATE "quiz_sessions" SET "user_id" = 'guest' WHERE "user_id" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "quiz_sessions" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attempts" (
  "id" serial PRIMARY KEY,
  "session_id" text NOT NULL REFERENCES "quiz_sessions"("id") ON DELETE CASCADE,
  "question_id" text NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "is_correct" boolean NOT NULL,
  "answer" text,
  "mode" text NOT NULL DEFAULT 'practice',
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attempts_session_question_unique" ON "attempts" ("session_id", "question_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attempts_question_idx" ON "attempts" ("question_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attempts_created_idx" ON "attempts" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practice_tests" (
  "id" text PRIMARY KEY,
  "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "test_number" integer NOT NULL,
  "title" text NOT NULL,
  "release_label" text,
  "is_custom" boolean NOT NULL DEFAULT false,
  "rw_minutes" integer NOT NULL DEFAULT 64,
  "math_minutes" integer NOT NULL DEFAULT 70,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "practice_tests" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
ALTER TABLE "practice_tests" ADD COLUMN IF NOT EXISTS "release_label" text;
--> statement-breakpoint
ALTER TABLE "practice_tests" ADD COLUMN IF NOT EXISTS "is_custom" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "practice_tests" ADD COLUMN IF NOT EXISTS "rw_minutes" integer NOT NULL DEFAULT 64;
--> statement-breakpoint
ALTER TABLE "practice_tests" ADD COLUMN IF NOT EXISTS "math_minutes" integer NOT NULL DEFAULT 70;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practice_test_questions" (
  "test_id" text NOT NULL REFERENCES "practice_tests"("id") ON DELETE CASCADE,
  "position" integer NOT NULL,
  "module" text NOT NULL,
  "question_id" text NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("test_id", "position")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ptq_test_idx" ON "practice_test_questions" ("test_id");
