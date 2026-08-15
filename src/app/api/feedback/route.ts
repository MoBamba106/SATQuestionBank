import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser, requireAdmin, AdminAuthError } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set(["complaint", "improvement", "bug", "other"]);

/** Best-effort bot: file the feedback as a GitHub issue on the project repo. */
async function createGithubIssue(entry: {
  category: string;
  title: string;
  message: string;
  email: string | null;
}): Promise<string | null> {
  const token = process.env.FEEDBACK_GITHUB_TOKEN?.trim();
  if (!token) return null;
  const repo = process.env.FEEDBACK_GITHUB_REPO?.trim() || "MoBamba106/SATQuestionBank";
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "sat-nexus-feedback-bot",
      },
      body: JSON.stringify({
        title: `[${entry.category}] ${entry.title}`,
        body:
          `**Category:** ${entry.category}\n` +
          (entry.email ? `**From:** ${entry.email}\n` : "**From:** anonymous user\n") +
          `\n${entry.message}\n\n---\n_Filed automatically by the SAT Nexus feedback bot._`,
        labels: ["user-feedback", entry.category],
      }),
    });
    if (!res.ok) {
      console.warn("[api/feedback] GitHub issue creation failed:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { html_url?: string };
    return data.html_url ?? null;
  } catch (error) {
    console.warn("[api/feedback] GitHub issue creation errored:", error);
    return null;
  }
}

import { z } from "zod";
import { sanitizeString, sanitizeOptionalString } from "@/lib/validation";

const feedbackSchema = z.object({
  category: z.enum(["complaint", "improvement", "bug", "other"]).catch("improvement"),
  title: sanitizeString.pipe(z.string().min(1, "A short title is required").max(180)),
  message: sanitizeString.pipe(z.string().min(1, "Please describe your feedback").max(5000)),
  email: z.string().trim().max(200).optional().nullable(),
  context: sanitizeOptionalString,
});

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const body = await req.json();
    
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { category, title, message, context } = parsed.data;
    const email = user.isGuest ? (parsed.data.email ? parsed.data.email : null) : user.email;
    
    const githubIssueUrl = await createGithubIssue({ category, title, message, email });

    const res = await db.execute(sql`
      INSERT INTO feedback (user_id, email, category, title, message, github_issue_url, context)
      VALUES (${user.isGuest ? null : user.id}, ${email}, ${category}, ${title}, ${message}, ${githubIssueUrl}, ${context})
      RETURNING id
    `);
    const id = ((res as unknown as { rows?: { id: number }[] }).rows ?? [])[0]?.id;
    return NextResponse.json({ ok: true, id, githubIssueUrl });
  } catch (e) {
    console.error("[api/feedback] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to submit feedback" }, { status: 500 });
  }
}

/** Admin: list all feedback. */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    await requireAdmin(req);
    const res = await db.execute(sql`
      SELECT f.id, f.email, f.category, f.title, f.message, f.status,
             f.github_issue_url AS "githubIssueUrl", f.context, (f.created_at AT TIME ZONE 'UTC') AS "createdAt",
             u.display_name AS "displayName"
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT 500
    `);
    return NextResponse.json({ feedback: (res as unknown as { rows: unknown[] }).rows ?? [] });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[api/feedback] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load feedback" }, { status: 500 });
  }
}

/** Admin: update feedback status. */
export async function PATCH(req: Request) {
  try {
    await ensureSeeded();
    await requireAdmin(req);
    const body = await req.json();
    const id = Number(body?.id);
    const status = String(body?.status ?? "");
    if (!Number.isFinite(id) || !["new", "reviewed", "done"].includes(status)) {
      return NextResponse.json({ error: "Invalid feedback update" }, { status: 400 });
    }
    await db.execute(sql`UPDATE feedback SET status = ${status} WHERE id = ${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update feedback" }, { status: 500 });
  }
}

/** Admin: delete a feedback entry (e.g. after it has been addressed). */
export async function DELETE(req: Request) {
  try {
    await ensureSeeded();
    await requireAdmin(req);
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
    }
    await db.execute(sql`DELETE FROM feedback WHERE id = ${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[api/feedback] DELETE failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to delete feedback" }, { status: 500 });
  }
}
