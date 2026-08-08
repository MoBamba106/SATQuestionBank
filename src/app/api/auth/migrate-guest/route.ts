import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser, ensureUserRow } from "@/lib/auth/server";
import { GUEST_USER_ID, isLocalGuestId } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/migrate-guest
 * Body: { guestId: string }
 *
 * Moves progress owned by a local guest id onto the signed-in account, then
 * deletes the guest row. Safe to call multiple times.
 */
export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) {
      return NextResponse.json({ error: "Sign in before importing guest progress." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const guestId = String(body?.guestId || "").trim();
    if (!guestId || !isLocalGuestId(guestId) || guestId === GUEST_USER_ID) {
      return NextResponse.json({ error: "Invalid guest id." }, { status: 400 });
    }
    if (guestId === user.id) {
      return NextResponse.json({ ok: true, migrated: false, reason: "same-id" });
    }

    await ensureUserRow(user);

    // Re-point every user-owned table. ON CONFLICT skips rows the account already has.
    const result = await db.transaction(async (tx) => {
      // Sessions + attempts travel with session ownership.
      await tx.execute(sql`
        UPDATE quiz_sessions SET user_id = ${user.id}
        WHERE user_id = ${guestId}
      `);

      await tx.execute(sql`
        INSERT INTO favorites (user_id, question_id, created_at)
        SELECT ${user.id}, question_id, created_at FROM favorites WHERE user_id = ${guestId}
        ON CONFLICT DO NOTHING
      `);
      await tx.execute(sql`DELETE FROM favorites WHERE user_id = ${guestId}`);

      await tx.execute(sql`
        INSERT INTO notes (user_id, question_id, note, updated_at)
        SELECT ${user.id}, question_id, note, updated_at FROM notes WHERE user_id = ${guestId}
        ON CONFLICT (user_id, question_id) DO UPDATE SET
          note = CASE
            WHEN EXCLUDED.note IS NOT NULL AND length(EXCLUDED.note) > length(COALESCE(notes.note, ''))
            THEN EXCLUDED.note ELSE notes.note
          END,
          updated_at = GREATEST(notes.updated_at, EXCLUDED.updated_at)
      `);
      await tx.execute(sql`DELETE FROM notes WHERE user_id = ${guestId}`);

      // Collections: rename on name collision then reassign.
      await tx.execute(sql`
        UPDATE collections c
        SET name = c.name || ' (imported)',
            user_id = ${user.id},
            updated_at = now()
        WHERE c.user_id = ${guestId}
      `);

      await tx.execute(sql`
        UPDATE feedback SET user_id = ${user.id}
        WHERE user_id = ${guestId}
      `);

      // Drop presence / leftover guest shell.
      await tx.execute(sql`DELETE FROM user_presence WHERE user_id = ${guestId}`);
      await tx.execute(sql`DELETE FROM users WHERE id = ${guestId}`);

      return { ok: true as const };
    });

    return NextResponse.json({ ...result, migrated: true, from: guestId, to: user.id });
  } catch (e) {
    console.error("[api/auth/migrate-guest] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Migration failed" },
      { status: 500 },
    );
  }
}
