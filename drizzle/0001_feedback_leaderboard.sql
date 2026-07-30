ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hide_leaderboard" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" serial PRIMARY KEY,
  "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "email" text,
  "category" text NOT NULL DEFAULT 'improvement',
  "title" text NOT NULL,
  "message" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'new',
  "github_issue_url" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_created_idx" ON "feedback" ("created_at");
