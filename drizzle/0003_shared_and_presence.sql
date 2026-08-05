CREATE TABLE IF NOT EXISTS "user_presence" (
  "user_id" text PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "last_seen" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_presence_last_seen_idx" ON "user_presence" ("last_seen");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared_questions" (
  "id" text PRIMARY KEY,
  "question_id" text NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "from_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "to_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_questions_to_user_idx" ON "shared_questions" ("to_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_questions_from_user_idx" ON "shared_questions" ("from_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_questions_expires_idx" ON "shared_questions" ("expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared_collections" (
  "id" text PRIMARY KEY,
  "collection_id" text NOT NULL REFERENCES "collections"("id") ON DELETE CASCADE,
  "from_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "to_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_collections_to_user_idx" ON "shared_collections" ("to_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_collections_from_user_idx" ON "shared_collections" ("from_user_id");
