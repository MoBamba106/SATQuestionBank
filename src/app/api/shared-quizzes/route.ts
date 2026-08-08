import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { uid } from "@/lib/utils";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

function rows<T>(res: unknown): T[] {
  return ((res as unknown as { rows?: T[] }).rows ?? []) as T[];
}

function makeToken() {
  return randomBytes(12).toString("base64url");
}

/**
 * GET /api/shared-quizzes
 * Lists quizzes shared to / by the current user (in-app delivery).
 */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.id === "guest") return NextResponse.json({ received: [], sent: [] });

    await db.execute(sql`DELETE FROM shared_quizzes WHERE expires_at < now()`);

    const received = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT sq.id, sq.token, sq.label, sq.mode, sq.question_ids AS "questionIds",
               sq.created_at AS "createdAt", sq.expires_at AS "expiresAt",
               fu.id AS "fromId", fu.email AS "fromEmail", fu.display_name AS "fromDisplayName",
               jsonb_array_length(sq.question_ids) AS "questionCount"
        FROM shared_quizzes sq
        JOIN users fu ON fu.id = sq.from_user_id
        WHERE sq.to_user_id = ${user.id}
        ORDER BY sq.created_at DESC
        LIMIT 100
      `),
    );

    const sent = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT sq.id, sq.token, sq.label, sq.mode, sq.question_ids AS "questionIds",
               sq.created_at AS "createdAt", sq.expires_at AS "expiresAt",
               tu.id AS "toId", tu.email AS "toEmail", tu.display_name AS "toDisplayName",
               jsonb_array_length(sq.question_ids) AS "questionCount"
        FROM shared_quizzes sq
        LEFT JOIN users tu ON tu.id = sq.to_user_id
        WHERE sq.from_user_id = ${user.id}
        ORDER BY sq.created_at DESC
        LIMIT 100
      `),
    );

    return NextResponse.json({ received, sent });
  } catch (e) {
    console.error("[api/shared-quizzes] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/**
 * POST /api/shared-quizzes
 * Body: { label, mode?, questionIds: string[], toUserId?, toEmail? }
 * Creates a shareable quiz snapshot. Always returns a public token URL.
 * When a recipient is provided, also delivers it in-app (like questions/collections).
 */
export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.id === "guest") {
      return NextResponse.json({ error: "Sign in to share quizzes" }, { status: 401 });
    }

    const body = await req.json();
    const label = String(body?.label || "Shared quiz").trim().slice(0, 160) || "Shared quiz";
    const mode = String(body?.mode || "practice").trim() || "practice";
    const rawIds = Array.isArray(body?.questionIds) ? (body.questionIds as unknown[]) : [];
    const questionIds = Array.from(
      new Set(
        rawIds
          .map((id) => String(id ?? "").trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ).slice(0, 200);

    if (questionIds.length === 0) {
      return NextResponse.json({ error: "Add at least one question to share." }, { status: 400 });
    }

    let toUserId = String(body?.toUserId || "").trim();
    const toEmail = String(body?.toEmail || "")
      .trim()
      .toLowerCase();

    if (!toUserId && toEmail) {
      const found = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${toEmail} LIMIT 1`);
      const foundRows = rows<{ id: string }>(found);
      const row = foundRows[0];
      if (!row) return NextResponse.json({ error: "No user with that email" }, { status: 404 });
      toUserId = row.id;
    }

    if (toUserId && toUserId === user.id) {
      return NextResponse.json({ error: "Cannot share to yourself" }, { status: 400 });
    }

    // Keep only IDs that still exist.
    const existing = rows<{ id: string }>(
      await db.execute(sql`
        SELECT id FROM questions WHERE id IN (${sql.join(
          questionIds.map((id) => sql`${id}`),
          sql`, `,
        )})
      `),
    );
    const existingSet = new Set(existing.map((r) => r.id));
    const validIds = questionIds.filter((id) => existingSet.has(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: "None of those questions could be found." }, { status: 404 });
    }

    const id = `${Date.now()}-${uid("qz")}`;
    const token = makeToken();
    const idsJson = JSON.stringify(validIds);
    const toUserValue = toUserId ? sql`${toUserId}` : sql`NULL`;

    await db.execute(sql`
      INSERT INTO shared_quizzes (id, token, from_user_id, to_user_id, label, mode, question_ids, expires_at)
      VALUES (
        ${id},
        ${token},
        ${user.id},
        ${toUserValue},
        ${label},
        ${mode},
        ${idsJson}::jsonb,
        now() + interval '7 days'
      )
    `);

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "http://localhost:3000";
    const shareUrl = `${origin.replace(/\/$/, "")}/quiz?share=${encodeURIComponent(token)}`;

    return NextResponse.json({
      id,
      token,
      shareUrl,
      label,
      mode,
      questionCount: validIds.length,
      expiresInDays: 7,
    });
  } catch (e) {
    console.error("[api/shared-quizzes] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/shared-quizzes?id=...
 */
export async function DELETE(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.id === "guest") return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db.execute(sql`
      DELETE FROM shared_quizzes
      WHERE id = ${id} AND (from_user_id = ${user.id} OR to_user_id = ${user.id})
    `);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/shared-quizzes] DELETE failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
