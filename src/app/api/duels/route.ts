import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { isLocalGuestId } from "@/lib/auth/types";
import { uid } from "@/lib/utils";
import { fetchQuestionsByIds, queryQuestions, buildQuestionFilters } from "@/lib/server-questions";

export const dynamic = "force-dynamic";

function rows<T>(res: unknown): T[] {
  return ((res as unknown as { rows?: T[] }).rows ?? []) as T[];
}

/** List my pending / active duels (as host or guest). */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) {
      return NextResponse.json({ inbox: [], active: [], recent: [] });
    }

    await db.execute(sql`
      UPDATE duels SET status = 'expired'
      WHERE status = 'pending' AND expires_at < now()
    `);

    const inbox = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT d.id, d.label, d.status, d.domain, d.skill, d.category, d.difficulty,
               d.question_count AS "questionCount",
               d.host_score AS "hostScore", d.guest_score AS "guestScore",
               d.created_at AS "createdAt", d.expires_at AS "expiresAt",
               hu.id AS "hostId", hu.display_name AS "hostName", hu.email AS "hostEmail"
        FROM duels d
        JOIN users hu ON hu.id = d.host_user_id
        WHERE d.guest_user_id = ${user.id} AND d.status = 'pending'
        ORDER BY d.created_at DESC
        LIMIT 20
      `),
    );

    const active = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT d.id, d.label, d.status, d.domain, d.skill, d.category, d.difficulty,
               d.question_count AS "questionCount",
               d.host_score AS "hostScore", d.guest_score AS "guestScore",
               d.current_index AS "currentIndex",
               d.host_user_id AS "hostUserId", d.guest_user_id AS "guestUserId",
               d.created_at AS "createdAt", d.started_at AS "startedAt"
        FROM duels d
        WHERE d.status = 'active' AND (d.host_user_id = ${user.id} OR d.guest_user_id = ${user.id})
        ORDER BY d.started_at DESC NULLS LAST
        LIMIT 20
      `),
    );

    const recent = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT d.id, d.label, d.status, d.host_score AS "hostScore", d.guest_score AS "guestScore",
               d.winner_user_id AS "winnerUserId", d.finished_at AS "finishedAt",
               d.host_user_id AS "hostUserId", d.guest_user_id AS "guestUserId"
        FROM duels d
        WHERE d.status IN ('completed','declined','cancelled','expired')
          AND (d.host_user_id = ${user.id} OR d.guest_user_id = ${user.id})
        ORDER BY COALESCE(d.finished_at, d.created_at) DESC
        LIMIT 20
      `),
    );

    return NextResponse.json({ inbox, active, recent });
  } catch (e) {
    console.error("[api/duels] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/**
 * Create a duel challenge.
 * Body: { toUserId?, toEmail?, count?, domain?, skill?, category?, difficulty?, label? }
 * - domain: Math | Reading & Writing
 * - skill: SAT domain category (Algebra, Craft and Structure, …)
 * - category: finer subskill within that skill
 */
export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) {
      return NextResponse.json({ error: "Sign in to start a duel." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let toUserId = String(body?.toUserId || "").trim();
    const toEmail = String(body?.toEmail || "").trim().toLowerCase();
    const count = Math.min(30, Math.max(5, Number(body?.count) || 10));
    const domain = body?.domain && body.domain !== "All" ? String(body.domain) : null;
    const skill = body?.skill && body.skill !== "All" ? String(body.skill) : null;
    const category = body?.category && body.category !== "All" ? String(body.category) : null;
    const difficulty = body?.difficulty && body.difficulty !== "All" ? String(body.difficulty) : null;
    const label = String(body?.label || "Quiz duel").trim().slice(0, 120) || "Quiz duel";

    if (!toUserId && toEmail) {
      const found = rows<{ id: string }>(
        await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${toEmail} LIMIT 1`),
      );
      if (!found[0]) return NextResponse.json({ error: "No user with that email." }, { status: 404 });
      toUserId = found[0].id;
    }
    if (!toUserId) return NextResponse.json({ error: "Pick an opponent." }, { status: 400 });
    if (toUserId === user.id) return NextResponse.json({ error: "You can't duel yourself." }, { status: 400 });
    if (isLocalGuestId(toUserId)) {
      return NextResponse.json({ error: "That opponent isn't signed in." }, { status: 400 });
    }

    const where = buildQuestionFilters({
      domain,
      skill,
      subskill: category,
      difficulty,
      userId: user.id,
    });
    const pool = await queryQuestions({
      userId: user.id,
      where,
      orderBy: sql`ORDER BY random()`,
      limit: count,
    });
    if (pool.length < 5) {
      return NextResponse.json(
        { error: "Not enough questions match those filters (need at least 5). Widen section/skill/category." },
        { status: 400 },
      );
    }

    const ids = pool.map((q) => q.id);
    const id = uid("duel");
    const idsJson = JSON.stringify(ids);

    await db.execute(sql`
      INSERT INTO duels (
        id, host_user_id, guest_user_id, status, label, domain, skill, category, difficulty,
        question_count, question_ids, expires_at
      ) VALUES (
        ${id}, ${user.id}, ${toUserId}, 'pending', ${label},
        ${domain}, ${skill}, ${category}, ${difficulty},
        ${ids.length}, ${idsJson}::jsonb, now() + interval '15 minutes'
      )
    `);

    return NextResponse.json({ id, questionCount: ids.length, status: "pending" });
  } catch (e) {
    console.error("[api/duels] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
