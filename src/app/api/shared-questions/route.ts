import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { isLocalGuestId } from "@/lib/auth/types";
import { uid } from "@/lib/utils";

export const dynamic = "force-dynamic";

function rows<T>(res: unknown): T[] {
  return ((res as unknown as { rows?: T[] }).rows ?? []) as T[];
}

/**
 * GET /api/shared-questions
 * Returns questions shared to current user (not expired) plus sent.
 */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) return NextResponse.json({ received: [], sent: [] });

    // Clean expired
    await db.execute(sql`DELETE FROM shared_questions WHERE expires_at < now()`);

    const received = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT sq.id, sq.question_id as "questionId", sq.created_at as "createdAt", sq.expires_at as "expiresAt",
               fu.id as "fromId", fu.email as "fromEmail", fu.display_name as "fromDisplayName",
               q.question_text, q.question_html, q.domain, q.skill, q.difficulty, q.type, q.choices
        FROM shared_questions sq
        JOIN users fu ON fu.id = sq.from_user_id
        JOIN questions q ON q.id = sq.question_id
        WHERE sq.to_user_id = ${user.id}
        ORDER BY sq.created_at DESC
        LIMIT 100
      `),
    );

    const sent = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT sq.id, sq.question_id as "questionId", sq.created_at as "createdAt", sq.expires_at as "expiresAt",
               tu.id as "toId", tu.email as "toEmail", tu.display_name as "toDisplayName"
        FROM shared_questions sq
        JOIN users tu ON tu.id = sq.to_user_id
        WHERE sq.from_user_id = ${user.id}
        ORDER BY sq.created_at DESC
        LIMIT 100
      `),
    );

    return NextResponse.json({ received, sent });
  } catch (e) {
    console.error("[api/shared-questions] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/**
 * POST /api/shared-questions
 * Body: { questionId: string, toUserId?: string, toEmail?: string }
 */
export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) return NextResponse.json({ error: "Sign in to share questions" }, { status: 401 });

    const body = await req.json();
    const questionId = String(body?.questionId || "").trim();
    let toUserId = String(body?.toUserId || "").trim();
    const toEmail = String(body?.toEmail || "").trim().toLowerCase();

    if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });
    if (!toUserId && !toEmail) return NextResponse.json({ error: "Recipient required" }, { status: 400 });

    // Verify question exists
    const qCheck = await db.execute(sql`SELECT id FROM questions WHERE id = ${questionId} LIMIT 1`);
    if (rows<Record<string, unknown>>(qCheck).length === 0) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (!toUserId && toEmail) {
      const found = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${toEmail} LIMIT 1`);
      const foundRows = rows<{ id: string }>(found);
      const row = foundRows[0];
      if (!row) return NextResponse.json({ error: "No user with that email" }, { status: 404 });
      toUserId = row.id;
    }

    if (toUserId === user.id) return NextResponse.json({ error: "Cannot share to yourself" }, { status: 400 });

    const id = `${Date.now()}-${uid("sq")}`;
    const expiresAt = sql`now() + interval '3 days'`;

    await db.execute(sql`
      INSERT INTO shared_questions (id, question_id, from_user_id, to_user_id, expires_at)
      VALUES (${id}, ${questionId}, ${user.id}, ${toUserId}, ${expiresAt})
    `);

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[api/shared-questions] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const sp = new URL(req.url).searchParams;
    const id = sp.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.execute(sql`
      DELETE FROM shared_questions
      WHERE id = ${id} AND (from_user_id = ${user.id} OR to_user_id = ${user.id})
    `);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
