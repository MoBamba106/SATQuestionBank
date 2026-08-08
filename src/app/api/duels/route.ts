import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { isLocalGuestId } from "@/lib/auth/types";
import { escapeHtml, sendEmail } from "@/lib/email";
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

    // Best-effort invite email — a failed email must never fail duel creation.
    const inviteEmail = await sendDuelInviteEmail({
      req,
      hostName: user.displayName || user.email || "Someone",
      guestUserId: toUserId,
      duelId: id,
      questionCount: ids.length,
      domain,
      skill,
      difficulty,
    });

    return NextResponse.json({ id, questionCount: ids.length, status: "pending", inviteEmail });
  } catch (e) {
    console.error("[api/duels] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

type DuelInviteEmailResult = { sent: boolean; reason?: string };

/**
 * Email the guest a branded duel invite. Never throws: returns
 * { sent: boolean, reason? } so callers can report it without failing the duel.
 */
async function sendDuelInviteEmail(params: {
  req: Request;
  hostName: string;
  guestUserId: string;
  duelId: string;
  questionCount: number;
  domain?: string | null;
  skill?: string | null;
  difficulty?: string | null;
}): Promise<DuelInviteEmailResult> {
  try {
    const [guest] = rows<{ email: string | null; displayName: string | null }>(
      await db.execute(
        sql`SELECT email, display_name AS "displayName" FROM users WHERE id = ${params.guestUserId} LIMIT 1`,
      ),
    );
    const guestEmail = guest?.email?.trim();
    if (!guestEmail) {
      return { sent: false, reason: "Guest has no email on file — the invite is in their Duels inbox." };
    }

    const origin =
      params.req.headers.get("origin")?.trim() ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      (() => {
        try {
          return new URL(params.req.url).origin;
        } catch {
          return "";
        }
      })();
    const duelUrl = `${(origin || "http://localhost:3000").replace(/\/+$/, "")}/duel/${params.duelId}`;

    const summary = [
      `${params.questionCount} questions`,
      params.domain,
      params.skill,
      params.difficulty,
    ]
      .filter((part): part is string => Boolean(part))
      .join(" · ");

    const result = await sendEmail({
      to: guestEmail,
      subject: `${params.hostName} challenged you to a quiz duel on SAT Nexus`,
      html: buildDuelInviteHtml({ hostName: params.hostName, summary, duelUrl }),
      text: buildDuelInviteText({ hostName: params.hostName, summary, duelUrl }),
    });

    return result.ok ? { sent: true } : { sent: false, reason: result.reason };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[api/duels] invite email failed (duel ${params.duelId}): ${reason}`);
    return { sent: false, reason };
  }
}

function buildDuelInviteHtml(opts: { hostName: string; summary: string; duelUrl: string }): string {
  const hostName = escapeHtml(opts.hostName);
  const summary = escapeHtml(opts.summary);
  const duelUrl = escapeHtml(opts.duelUrl);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f8fc;font-family:IBM Plex Sans,Segoe UI,sans-serif;color:#182437;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f8fc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #cdd9e5;border-radius:10px;padding:28px 24px;">
            <tr><td>
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#718096;">SAT Nexus</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;">You&rsquo;ve been challenged to a duel!</h1>
              <p style="margin:0 0 16px;font-size:14.5px;line-height:1.55;color:#46566c;">
                <strong>${hostName}</strong> challenged you to a head-to-head quiz duel:
              </p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#182437;font-weight:700;">${summary}</p>
              <p style="margin:0 0 22px;">
                <a href="${duelUrl}" style="display:inline-block;background:#2352b8;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:6px;">
                  Accept the challenge
                </a>
              </p>
              <p style="margin:0 0 18px;font-size:12.5px;line-height:1.5;color:#718096;">
                This challenge expires in about 15 minutes, so don&rsquo;t wait too long.
              </p>
              <p style="margin:0 0 8px;font-size:12.5px;line-height:1.5;color:#718096;">
                If the button doesn&rsquo;t work, paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;line-height:1.45;word-break:break-all;color:#2352b8;">${duelUrl}</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildDuelInviteText(opts: { hostName: string; summary: string; duelUrl: string }): string {
  return [
    "SAT Nexus — You've been challenged to a duel!",
    "",
    `${opts.hostName} challenged you to a head-to-head quiz duel:`,
    opts.summary,
    "",
    `Open the challenge here (it expires in about 15 minutes): ${opts.duelUrl}`,
    "",
    "If the link doesn't work, copy and paste it into your browser.",
  ].join("\n");
}
