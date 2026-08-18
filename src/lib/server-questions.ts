import { db } from "@/db";
import { sql, SQL } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { GUEST_USER_ID } from "@/lib/auth/types";
import type { SATQuestion, Choice } from "@/lib/types";

/** Columns shared by every question query: question + per-user favorite/note + attempt stats */
export function questionSelect(userId: string) {
  return sql`
  q.id, q.question_text, q.question_html, q.passage, q.passage_html,
  q.correct_answer, q.explanation, q.difficulty, q.domain, q.skill, q.subskill,
  q.source, q.type, q.choices,
  (f.question_id IS NOT NULL) AS favorite,
  n.note AS note,
  COALESCE(a.cnt, 0)::int AS times_answered,
  COALESCE(a.correct_cnt, 0)::int AS times_correct,
  a.last_at AS last_attempt_at
`;
}

export function questionJoins(userId: string) {
  return sql`
  LEFT JOIN favorites f ON f.question_id = q.id AND f.user_id = ${userId}
  LEFT JOIN notes n ON n.question_id = q.id AND n.user_id = ${userId}
  LEFT JOIN (
    SELECT at.question_id, COUNT(*) AS cnt,
           SUM(CASE WHEN at.is_correct THEN 1 ELSE 0 END) AS correct_cnt,
           MAX(at.created_at) AS last_at
    FROM attempts at
    INNER JOIN quiz_sessions qs ON qs.id = at.session_id AND qs.user_id = ${userId}
    GROUP BY at.question_id
  ) a ON a.question_id = q.id
`;
}

/** @deprecated use questionSelect(userId) — kept for import compatibility during migration */
export const QUESTION_SELECT = sql`
  q.id, q.question_text, q.question_html, q.passage, q.passage_html,
  q.correct_answer, q.explanation, q.difficulty, q.domain, q.skill, q.subskill,
  q.source, q.type, q.choices,
  (f.question_id IS NOT NULL) AS favorite,
  n.note AS note,
  COALESCE(a.cnt, 0)::int AS times_answered,
  COALESCE(a.correct_cnt, 0)::int AS times_correct,
  a.last_at AS last_attempt_at
`;

export const QUESTION_JOINS = sql`
  LEFT JOIN favorites f ON f.question_id = q.id AND f.user_id = ${GUEST_USER_ID}
  LEFT JOIN notes n ON n.question_id = q.id AND n.user_id = ${GUEST_USER_ID}
  LEFT JOIN (
    SELECT at.question_id, COUNT(*) AS cnt,
           SUM(CASE WHEN at.is_correct THEN 1 ELSE 0 END) AS correct_cnt,
           MAX(at.created_at) AS last_at
    FROM attempts at
    INNER JOIN quiz_sessions qs ON qs.id = at.session_id AND qs.user_id = ${GUEST_USER_ID}
    GROUP BY at.question_id
  ) a ON a.question_id = q.id
`;

type Row = Record<string, unknown> & { choices?: unknown };

export function mapRow(r: Row): SATQuestion {
  const timesAnswered = Number(r.times_answered ?? 0);
  const timesCorrect = Number(r.times_correct ?? 0);
  return {
    id: String(r.id),
    questionText: (r.question_text as string) ?? "",
    questionHtml: (r.question_html as string) ?? null,
    passage: (r.passage as string) ?? null,
    passageHtml: (r.passage_html as string) ?? null,
    choices: Array.isArray(r.choices) ? (r.choices as Choice[]) : null,
    correctAnswer: String(r.correct_answer ?? ""),
    explanation: (r.explanation as string) ?? null,
    difficulty: String(r.difficulty ?? "Medium"),
    domain: String(r.domain ?? ""),
    skill: String(r.skill ?? ""),
    subskill: (r.subskill as string) ?? null,
    source: (r.source as string) ?? null,
    type: (r.type as SATQuestion["type"]) ?? "multiple_choice",
    favorite: Boolean(r.favorite),
    note: (r.note as string) ?? null,
    timesAnswered,
    timesCorrect,
    mastery: timesAnswered > 0 ? Math.round((timesCorrect / timesAnswered) * 100) : 0,
    lastAttemptAt: r.last_attempt_at ? new Date(r.last_attempt_at as string).toISOString() : null,
  };
}

export async function queryQuestions(opts: {
  userId?: string;
  where?: SQL;
  orderBy?: SQL;
  limit?: number;
  offset?: number;
}): Promise<SATQuestion[]> {
  await ensureSeeded();
  const userId = opts.userId || GUEST_USER_ID;
  const stmt = sql`
    SELECT ${questionSelect(userId)}
    FROM questions q
    ${questionJoins(userId)}
    ${opts.where ? sql`WHERE ${opts.where}` : sql``}
    ${opts.orderBy ?? sql`ORDER BY q.id`}
    ${opts.limit != null ? sql`LIMIT ${opts.limit}` : sql``}
    ${opts.offset != null ? sql`OFFSET ${opts.offset}` : sql``}
  `;
  const res = await db.execute(stmt);
  return ((res as unknown as { rows: Row[] }).rows ?? []).map(mapRow);
}

export async function countQuestions(where?: SQL): Promise<number> {
  await ensureSeeded();
  const res = await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM questions q
    ${where ? sql`WHERE ${where}` : sql``}
  `);
  return Number((res as unknown as { rows: { c: number }[] }).rows?.[0]?.c ?? 0);
}

export function buildQuestionFilters(p: {
  domain?: string | null;
  skill?: string | null;
  subskill?: string | null;
  difficulty?: string | null;
  search?: string | null;
  favoritesOnly?: boolean;
  userId?: string;
}): SQL | undefined {
  const conds: SQL[] = [];
  const eq = (v?: string | null) => v && v !== "All" && v !== "all";
  if (eq(p.domain)) conds.push(sql`q.domain = ${p.domain}`);
  if (eq(p.skill)) {
    // Categories/domains can be multi-selected (e.g. "Craft and Structure",
    // "Information and Ideas") — match questions from ANY selected category.
    const parts = p.skill!.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length === 1) {
      conds.push(sql`q.skill = ${parts[0]}`);
    } else if (parts.length > 1) {
      const params = sql.join(parts.map((part) => sql`${part}`), sql`, `);
      conds.push(sql`q.skill IN (${params})`);
    }
  }
  if (eq(p.subskill)) conds.push(sql`TRIM(LOWER(q.subskill)) = TRIM(LOWER(${p.subskill}))`);
  if (eq(p.difficulty)) {
    const parts = p.difficulty!.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length === 1) {
      conds.push(sql`q.difficulty = ${parts[0]}`);
    } else if (parts.length > 1) {
      const params = sql.join(parts.map((part) => sql`${part}`), sql`, `);
      conds.push(sql`q.difficulty IN (${params})`);
    }
  }
  if (p.search && p.search.trim()) {
    // Users often paste an id with its leading "#" (e.g. "#000259aa"). Strip it
    // so we match the actual 8-hex-char ids stored in the bank.
    let clean = p.search.trim();
    if (clean.startsWith("#")) clean = clean.slice(1).trim();
    const s = `%${clean}%`;

    // Exact full id match (our bank stores 8-char hex ids; UUIDs are also
    // accepted for forward-compatibility).
    const isFullId =
      /^[0-9a-fA-F]{8}$/.test(clean) ||
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clean);

    if (isFullId) {
      conds.push(sql`q.id = ${clean}`);
    } else {
      // Search the meaningful textual fields — question stem, passage (and its
      // html), id, skill/subskill, and explanation — so a word or phrase that
      // appears in a passage still surfaces the question.
      conds.push(sql`(
        q.question_text ILIKE ${s} OR
        q.question_html ILIKE ${s} OR
        q.passage ILIKE ${s} OR
        q.passage_html ILIKE ${s} OR
        q.id ILIKE ${s} OR
        q.skill ILIKE ${s} OR
        q.subskill ILIKE ${s} OR
        q.explanation ILIKE ${s}
      )`);
    }
  }
  if (p.favoritesOnly) {
    const uid = p.userId || GUEST_USER_ID;
    conds.push(sql`q.id IN (SELECT question_id FROM favorites WHERE user_id = ${uid})`);
  }
  if (conds.length === 0) return undefined;
  return sql.join(conds, sql` AND `);
}

export async function fetchQuestionsByIds(ids: string[], userId = GUEST_USER_ID): Promise<SATQuestion[]> {
  const requestedIds = ids.slice(0, 500).map(String).filter(Boolean);
  if (requestedIds.length === 0) return [];
  await ensureSeeded();

  const uniqueIds = Array.from(new Set(requestedIds));
  const idParams = sql.join(
    uniqueIds.map((id) => sql`${id}`),
    sql`, `,
  );
  const res = await db.execute(sql`
    SELECT ${questionSelect(userId)}
    FROM questions q
    ${questionJoins(userId)}
    WHERE q.id IN (${idParams})
  `);
  const rows = ((res as unknown as { rows: Row[] }).rows ?? []).map(mapRow);
  const byId = new Map(rows.map((q) => [q.id, q]));
  return uniqueIds.map((id) => byId.get(id)).filter(Boolean) as SATQuestion[];
}
