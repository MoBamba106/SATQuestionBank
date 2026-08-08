CREATE TABLE IF NOT EXISTS "duels" (
  "id" text PRIMARY KEY,
  "host_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "guest_user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "label" text NOT NULL DEFAULT 'Quiz duel',
  "domain" text,
  "difficulty" text,
  "question_count" integer NOT NULL DEFAULT 10,
  "question_ids" jsonb NOT NULL,
  "host_score" integer NOT NULL DEFAULT 0,
  "guest_score" integer NOT NULL DEFAULT 0,
  "current_index" integer NOT NULL DEFAULT 0,
  "answers" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "winner_user_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "started_at" timestamp,
  "finished_at" timestamp,
  "expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "duels_host_idx" ON "duels" ("host_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "duels_guest_idx" ON "duels" ("guest_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "duels_status_idx" ON "duels" ("status");
