import { uid } from "./utils";
import { readStoredAuth } from "./auth/client";

const DB_KEY = "sat_guest_db";

function getGuestDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { sessions: [], attempts: [] };
}

function saveGuestDb(db: any) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {}
}

export async function handleGuestApi(url: string, init?: RequestInit): Promise<any | null> {
  const { user } = readStoredAuth();
  if (!user.isGuest) return null;

  const method = init?.method || "GET";
  let body: any = {};
  if (init?.body && typeof init.body === "string") {
    try { body = JSON.parse(init.body); } catch (e) {}
  }

  const cleanUrl = url.split("?")[0];

  if (cleanUrl === "/api/sessions" && method === "POST") {
    const db = getGuestDb();
    const id = uid("quiz");
    db.sessions.push({
      id, mode: body.mode || "practice", label: body.label || null,
      testId: body.testId || null, totalQuestions: body.totalQuestions || 0,
      createdAt: new Date().toISOString()
    });
    saveGuestDb(db);
    return { id, mode: body.mode, label: body.label, testId: body.testId, totalQuestions: body.totalQuestions, userId: user.id };
  }

  if (cleanUrl.startsWith("/api/sessions/") && method === "PATCH") {
    const id = cleanUrl.split("/api/sessions/")[1];
    const db = getGuestDb();
    const sess = db.sessions.find((s: any) => s.id === id);
    if (sess) {
      Object.assign(sess, body);
      saveGuestDb(db);
    }
    return { ok: true };
  }

  if (cleanUrl === "/api/attempts" && method === "POST") {
    const db = getGuestDb();
    let recorded = 0;
    let duplicates = 0;
    let overridden = 0;
    const list = Array.isArray(body.attempts) ? body.attempts : [{ questionId: body.questionId, isCorrect: body.isCorrect, answer: body.answer }];
    for (const a of list) {
      if (!a.questionId || typeof a.isCorrect !== "boolean") continue;
      const exists = db.attempts.find((x: any) => x.sessionId === body.sessionId && x.questionId === a.questionId);
      // "I was actually right": flip the existing graded row to correct so
      // accuracy recalculates and the question leaves the mistake bank.
      if (exists && body.override) {
        exists.isCorrect = true;
        exists.answer = a.answer ?? exists.answer;
        overridden++;
      } else if (exists) {
        duplicates++;
      } else {
        db.attempts.push({
          id: Date.now() + recorded,
          sessionId: body.sessionId,
          questionId: a.questionId,
          isCorrect: a.isCorrect,
          answer: a.answer,
          mode: body.mode,
          createdAt: new Date().toISOString(),
        });
        recorded++;
      }
    }
    saveGuestDb(db);
    return { recorded, duplicates, overridden };
  }

  if (cleanUrl === "/api/stats" && method === "GET") {
    const db = getGuestDb();
    const attempts = db.attempts;
    const correctCount = attempts.filter((a: any) => a.isCorrect).length;
    const uniq = new Set(attempts.map((a: any) => a.questionId)).size;
    const mistakesCount = Object.values(
      attempts.reduce((acc: any, a: any) => { acc[a.questionId] = a.isCorrect; return acc; }, {})
    ).filter((c) => c === false).length;

    return {
      uniqueQuestions: uniq,
      totalAttempts: attempts.length,
      totalCorrect: correctCount,
      accuracy: attempts.length ? Math.round((correctCount / attempts.length) * 100) : 0,
      mistakesCount,
      favoritesCount: 0,
      collectionsCount: 0,
      sessionsCount: db.sessions.filter((s:any) => s.finishedAt).length,
      streak: { current: 0, longest: 0 },
      byDomain: [],
      bySkill: [],
      byDifficulty: [],
      activity: [],
      recentSessions: [],
    };
  }

  if (cleanUrl === "/api/mistakes" && method === "GET") {
    return { questions: [] };
  }

  // Not handled by guest mock
  return null;
}
