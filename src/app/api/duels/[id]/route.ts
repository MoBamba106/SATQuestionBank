import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { isLocalGuestId } from "@/lib/auth/types";
import { fetchQuestionsByIds } from "@/lib/server-questions";
import { answersMatch, resolveCorrectAnswer } from "@/lib/utils";
import { DUEL_STALE_INTERVAL_SQL } from "@/lib/duels";

export const dynamic = "force-dynamic";

function rows<T>(res: unknown): T[] {
  return ((res as unknown as { rows?: T[] }).rows ?? []) as T[];
}

type AnswerLock = {
  userId: string;
  answer: string;
  correct: boolean;
  at: string;
};

function parseAnswers(raw: unknown): Record<string, AnswerLock> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, AnswerLock>;
}

function parseIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      return (JSON.parse(raw) as unknown[]).map(String);
    } catch {
      return [];
    }
  }
  return [];
}

async function loadDuel(id: string) {
  const res = await db.execute(sql`
    SELECT d.*,
           hu.display_name AS "hostName", hu.email AS "hostEmail",
           gu.display_name AS "guestName", gu.email AS "guestEmail"
    FROM duels d
    JOIN users hu ON hu.id = d.host_user_id
    LEFT JOIN users gu ON gu.id = d.guest_user_id
    WHERE d.id = ${id}
    LIMIT 1
  `);
  return rows<Record<string, unknown>>(res)[0] ?? null;
}

/**
 * Auto-expire an active room whose players have been silent (no WebSocket
 * heartbeat / user action) for the 90s staleness window. Runs before reads
 * so a stale room surfaces to clients as "Expired" instead of a live duel.
 */
async function expireIfStale(id: string) {
  await db.execute(sql`
    UPDATE duels SET status = 'expired', finished_at = now()
    WHERE id = ${id} AND status = 'active'
      AND COALESCE(last_active_at, started_at, created_at) < now() - ${sql.raw(DUEL_STALE_INTERVAL_SQL)}
  `);
}

function participant(userId: string, duel: Record<string, unknown>) {
  if (duel.host_user_id === userId) return "host" as const;
  if (duel.guest_user_id === userId) return "guest" as const;
  return null;
}

/** GET duel detail + questions (for participants only). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const { id } = await ctx.params;
    await expireIfStale(id);
    const duel = await loadDuel(id);
    if (!duel) return NextResponse.json({ error: "Duel not found" }, { status: 404 });
    if (!participant(user.id, duel)) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const ids = parseIds(duel.question_ids);
    const questions = await fetchQuestionsByIds(ids, user.id);
    // Hide correct answers while the duel is live.
    const scrubbed =
      duel.status === "active" || duel.status === "pending"
        ? questions.map((q) => ({
            ...q,
            correctAnswer: "",
            explanation: null,
          }))
        : questions;

    return NextResponse.json({
      id: duel.id,
      status: duel.status,
      label: duel.label,
      domain: duel.domain,
      difficulty: duel.difficulty,
      questionCount: duel.question_count,
      hostUserId: duel.host_user_id,
      guestUserId: duel.guest_user_id,
      hostName: duel.hostName || duel.hostEmail || "Host",
      guestName: duel.guestName || duel.guestEmail || "Opponent",
      hostScore: Number(duel.host_score ?? 0),
      guestScore: Number(duel.guest_score ?? 0),
      currentIndex: Number(duel.current_index ?? 0),
      answers: parseAnswers(duel.answers),
      winnerUserId: duel.winner_user_id,
      createdAt: duel.created_at,
      startedAt: duel.started_at,
      finishedAt: duel.finished_at,
      expiresAt: duel.expires_at,
      questions: scrubbed,
      you: participant(user.id, duel),
    });
  } catch (e) {
    console.error("[api/duels/id] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/**
 * PATCH duel actions:
 *  { action: "accept" | "decline" | "cancel" }
 *  { action: "answer", questionId, answer }
 */
import { z } from "zod";
import { sanitizeOptionalString } from "@/lib/validation";

const duelPatchSchema = z.object({
  action: z.enum(["accept", "decline", "cancel", "answer", "heartbeat"]),
  questionId: z.string().optional(),
  answer: sanitizeOptionalString,
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    
    const parsed = duelPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { action, questionId, answer } = parsed.data;
    await expireIfStale(id);
    const duel = await loadDuel(id);
    if (!duel) return NextResponse.json({ error: "Duel not found" }, { status: 404 });
    const role = participant(user.id, duel);
    if (!role) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

    // WebSocket-room heartbeat — a participant is alive in the room. Any
    // action below also refreshes last_active_at so user actions count too.
    if (action === "heartbeat") {
      if (duel.status !== "active" && duel.status !== "pending") {
        return NextResponse.json({ ok: true, status: duel.status });
      }
      await db.execute(sql`
        UPDATE duels SET last_active_at = now()
        WHERE id = ${id} AND status = ${duel.status}
      `);
      return NextResponse.json({ ok: true, status: duel.status, at: new Date().toISOString() });
    }

    if (action === "accept") {
      if (role !== "guest" || duel.status !== "pending") {
        return NextResponse.json({ error: "Only the challenged player can accept." }, { status: 400 });
      }
      await db.execute(sql`
        UPDATE duels SET status = 'active', started_at = now(), last_active_at = now()
        WHERE id = ${id} AND status = 'pending'
      `);
      return NextResponse.json({ ok: true, status: "active" });
    }

    if (action === "decline") {
      if (role !== "guest" || duel.status !== "pending") {
        return NextResponse.json({ error: "Only the challenged player can decline." }, { status: 400 });
      }
      await db.execute(sql`
        UPDATE duels SET status = 'declined', finished_at = now(), last_active_at = now()
        WHERE id = ${id} AND status = 'pending'
      `);
      return NextResponse.json({ ok: true, status: "declined" });
    }

    if (action === "cancel") {
      if (role !== "host" || duel.status !== "pending") {
        return NextResponse.json({ error: "Only the host can cancel a pending duel." }, { status: 400 });
      }
      await db.execute(sql`
        UPDATE duels SET status = 'cancelled', finished_at = now(), last_active_at = now()
        WHERE id = ${id} AND status = 'pending'
      `);
      return NextResponse.json({ ok: true, status: "cancelled" });
    }

    if (action === "answer") {
      if (duel.status !== "active") {
        return NextResponse.json({ error: "Duel is not active." }, { status: 400 });
      }
      const questionId = String(body?.questionId || "").trim();
      const answer = String(body?.answer ?? "").trim();
      if (!questionId || !answer) {
        return NextResponse.json({ error: "questionId and answer required" }, { status: 400 });
      }

      const ids = parseIds(duel.question_ids);
      const idx = ids.indexOf(questionId);
      if (idx < 0) return NextResponse.json({ error: "Question not in this duel" }, { status: 400 });

      const currentIndex = Number(duel.current_index ?? 0);
      // Only the current question can be answered (keeps both players in sync).
      if (idx !== currentIndex) {
        return NextResponse.json({ error: "Wait for the current question." }, { status: 409 });
      }

      const locks = parseAnswers(duel.answers);
      if (locks[questionId]) {
        return NextResponse.json(
          { error: "Already answered — first lock wins.", lock: locks[questionId] },
          { status: 409 },
        );
      }

      // Load truth for scoring (not exposed to the client during active play).
      const qs = await fetchQuestionsByIds([questionId], user.id);
      const q = qs[0];
      if (!q) return NextResponse.json({ error: "Question missing" }, { status: 404 });
      const correctKey = resolveCorrectAnswer(q.correctAnswer, q.explanation);
      const isCorrect = answersMatch(answer, correctKey);

      locks[questionId] = {
        userId: user.id,
        answer,
        correct: isCorrect,
        at: new Date().toISOString(),
      };

      let hostScore = Number(duel.host_score ?? 0);
      let guestScore = Number(duel.guest_score ?? 0);
      if (isCorrect) {
        if (role === "host") hostScore += 1;
        else guestScore += 1;
      }

      const nextIndex = currentIndex + 1;
      const finished = nextIndex >= ids.length;
      let winner: string | null = null;
      if (finished) {
        if (hostScore > guestScore) winner = String(duel.host_user_id);
        else if (guestScore > hostScore) winner = duel.guest_user_id ? String(duel.guest_user_id) : null;
      }

      const answersJson = JSON.stringify(locks);
      await db.execute(sql`
        UPDATE duels SET
          answers = ${answersJson}::jsonb,
          host_score = ${hostScore},
          guest_score = ${guestScore},
          current_index = ${finished ? currentIndex : nextIndex},
          status = ${finished ? "completed" : "active"},
          winner_user_id = ${winner},
          finished_at = CASE WHEN ${finished} THEN now() ELSE finished_at END,
          last_active_at = now()
        WHERE id = ${id} AND status = 'active'
      `);

      return NextResponse.json({
        ok: true,
        lock: locks[questionId],
        hostScore,
        guestScore,
        currentIndex: finished ? currentIndex : nextIndex,
        status: finished ? "completed" : "active",
        winnerUserId: winner,
        correct: isCorrect,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[api/duels/id] PATCH failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
