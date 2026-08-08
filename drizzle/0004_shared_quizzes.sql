CREATE TABLE IF NOT EXISTS "shared_quizzes" (
  "id" text PRIMARY KEY,
  "token" text NOT NULL,
  "from_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "to_user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "label" text NOT NULL DEFAULT 'Shared quiz',
  "mode" text NOT NULL DEFAULT 'practice',
  "question_ids" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shared_quizzes_token_uidx" ON "shared_quizzes" ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_quizzes_to_user_idx" ON "shared_quizzes" ("to_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_quizzes_from_user_idx" ON "shared_quizzes" ("from_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_quizzes_expires_idx" ON "shared_quizzes" ("expires_at");
