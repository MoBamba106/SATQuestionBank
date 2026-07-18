import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import {
  buildQuestionFilters,
  countQuestions,
  fetchQuestionsByIds,
  queryQuestions,
} from "@/lib/server-questions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const sp = new URL(req.url).searchParams;
    const domain = sp.get("domain");
    const skill = sp.get("skill");
    const subskill = sp.get("subskill");
    const difficulty = sp.get("difficulty");
    const search = sp.get("search");
    const favoritesOnly = sp.get("favorites") === "1";
    const random = sp.get("random") === "1";
    const limit = Math.min(Number(sp.get("limit") ?? 0) || 0, 200);
    const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
    const pageSize = Math.min(Math.max(1, Number(sp.get("pageSize") ?? 48) || 48), 200);

    const where = buildQuestionFilters({ domain, skill, subskill, difficulty, search, favoritesOnly });

    if (random && limit > 0) {
      const questions = await queryQuestions({ where, orderBy: sql`ORDER BY random()`, limit });
      return NextResponse.json({ total: questions.length, page: 1, pageSize: limit, questions });
    }

    const [total, questions] = await Promise.all([
      countQuestions(where),
      queryQuestions({ where, limit: pageSize, offset: (page - 1) * pageSize }),
    ]);
    return NextResponse.json({ total, page, pageSize, questions });
  } catch (e) {
    console.error("[api/questions] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load questions" }, { status: 500 });
  }
}

/** Batch fetch by explicit ids (order preserved) */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.slice(0, 500).map(String) : [];
    const questions = await fetchQuestionsByIds(ids);
    return NextResponse.json({ total: questions.length, page: 1, pageSize: questions.length, questions });
  } catch (e) {
    console.error("[api/questions] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load questions" }, { status: 500 });
  }
}
