ALTER TABLE "duels" ADD COLUMN IF NOT EXISTS "last_active_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "duels_last_active_idx" ON "duels" ("last_active_at");
