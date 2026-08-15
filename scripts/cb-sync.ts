/**
 * SAT Nexus — incremental College Board question-bank sync.
 *
 * Unlike the older `cb-import.ts` (which rebuilds `question-bank.json` from
 * scratch and emits a slightly different shape), this script **merges**: it
 * fetches the current College Board catalogue, normalises each question into
 * the exact schema already used by `src/data/question-bank.json`, and only
 * appends questions whose id is not already present.
 *
 * Guarantees
 *  - Existing questions are never rewritten (unless `--update-existing`).
 *  - Existing ids are preserved; `questionId` from College Board is the id, so
 *    a re-run is idempotent.
 *  - A timestamped backup of the current bank is written before saving.
 *  - The merged file is validated (see `scripts/validate-question-bank.ts`)
 *    before it replaces the old one.
 *
 * Usage
 *   npx tsx scripts/cb-sync.ts --dry-run     # report what would be added
 *   npx tsx scripts/cb-sync.ts               # fetch, merge, back up, write
 *   npx tsx scripts/cb-sync.ts --update-existing
 *
 * Requires outbound network access to qbank-api.collegeboard.org.
 */
import fs from "node:fs";
import path from "node:path";

/* ------------------------------------------------------------------ types */

type Choice = { key: string; text: string; html: string | null };

/** The exact on-disk shape of every entry in src/data/question-bank.json. */
type BankQuestion = {
  id: string;
  questionText: string;
  questionHtml: string | null;
  passage: string | null;
  passageHtml: string | null;
  correctAnswer: string;
  explanation: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  domain: "Math" | "Reading & Writing";
  skill: string;
  subskill: string | null;
  source: string | null;
  type: "multiple_choice" | "free_response";
  choices: Choice[] | null;
};

type CbMeta = {
  questionId: string;
  external_id?: string;
  ibn?: string;
  difficulty?: string;
  primary_class_cd_desc?: string;
  skill_desc?: string;
};

/* ------------------------------------------------------------- constants */

const BANK_PATH = path.join(process.cwd(), "src", "data", "question-bank.json");
const BACKUP_DIR = path.join(process.cwd(), "src", "data", "backups");
const SOURCE_LABEL = "College Board SAT Question Bank";
const QBANK_BASE =
  "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital";

/** Domain codes exactly as the College Board question bank exposes them. */
const DOMAINS = [
  { test: 2, domain: "H", name: "Algebra", cbDomain: "Math" },
  { test: 2, domain: "P", name: "Advanced Math", cbDomain: "Math" },
  { test: 2, domain: "Q", name: "Problem-Solving and Data Analysis", cbDomain: "Math" },
  { test: 2, domain: "S", name: "Geometry and Trigonometry", cbDomain: "Math" },
  { test: 1, domain: "INI", name: "Information and Ideas", cbDomain: "Reading & Writing" },
  { test: 1, domain: "CAS", name: "Craft and Structure", cbDomain: "Reading & Writing" },
  { test: 1, domain: "EOI", name: "Expression of Ideas", cbDomain: "Reading & Writing" },
  { test: 1, domain: "SEC", name: "Standard English Conventions", cbDomain: "Reading & Writing" },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* --------------------------------------------------------------- helpers */

function toText(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDifficulty(raw: string | undefined): BankQuestion["difficulty"] {
  if (raw === "E") return "Easy";
  if (raw === "H") return "Hard";
  return "Medium";
}

/* ------------------------------------------------------------- fetching */

async function fetchList(test: number, domain: string): Promise<CbMeta[]> {
  const res = await fetch(`${QBANK_BASE}/get-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ asmtEventId: 99, test, domain }),
  });
  if (!res.ok) throw new Error(`get-questions ${domain}: ${res.status} ${await res.text()}`);
  return (await res.json()) as CbMeta[];
}

async function fetchQuestion(externalId: string) {
  const res = await fetch(`${QBANK_BASE}/get-question`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ external_id: externalId }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Disclosed (released-test) items live on a different host and shape. */
async function fetchDisclosed(ibn: string) {
  try {
    const res = await fetch(`https://saic.collegeboard.org/disclosed/${ibn}.json`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const arr = await res.json();
    const d = Array.isArray(arr) ? arr[0] : null;
    if (!d) return null;
    return {
      type: d.answer?.style === "Multiple Choice" ? "mcq" : "spr",
      stem: d.prompt || "",
      stimulus: d.body || "",
      answerOptions: d.answer?.choices
        ? {
            A: d.answer.choices.a?.body || "",
            B: d.answer.choices.b?.body || "",
            C: d.answer.choices.c?.body || "",
            D: d.answer.choices.d?.body || "",
          }
        : undefined,
      correct_answer: d.answer?.correct_choice ? [String(d.answer.correct_choice).toUpperCase()] : [],
      rationale: d.answer?.rationale || "",
    };
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------- normalising */

function normalize(meta: CbMeta, qdata: Record<string, unknown>, cbDomain: string): BankQuestion | null {
  const stemHtml = (qdata.stem as string) || "";
  const stimulusHtml = (qdata.stimulus as string) || "";

  let choices: Choice[] | null = null;
  const answerOptions = qdata.answerOptions as unknown;
  if (answerOptions) {
    const entries: Choice[] = Array.isArray(answerOptions)
      ? (answerOptions as { content?: string }[]).map((opt, i) => ({
          key: ["A", "B", "C", "D"][i] ?? String(i),
          text: String(opt?.content ?? opt ?? ""),
          html: null,
        }))
      : Object.entries(answerOptions as Record<string, unknown>).map(([k, v]) => ({
          key: k.toUpperCase(),
          text: String(v ?? ""),
          html: null,
        }));
    const filtered = entries.filter((c) => c.text.trim());
    choices = filtered.length ? filtered : null;
  }

  const rawCorrect = Array.isArray(qdata.correct_answer)
    ? (qdata.correct_answer as unknown[])[0]
    : qdata.correct_answer;
  const isMcq = qdata.type === "mcq" || (choices?.length ?? 0) > 0;
  // Multiple choice keys are letters; free response keeps the literal value.
  const correctAnswer = isMcq
    ? String(rawCorrect ?? "").toUpperCase().trim()
    : String(rawCorrect ?? "").trim();

  if (!correctAnswer) return null;

  const questionText = toText(stemHtml) || toText(stimulusHtml).slice(0, 400);
  if (!questionText) return null;

  return {
    id: meta.questionId,
    questionText,
    questionHtml: stemHtml || null,
    passage: stimulusHtml ? toText(stimulusHtml) : null,
    passageHtml: stimulusHtml || null,
    correctAnswer,
    explanation: (qdata.rationale as string) || null,
    difficulty: normalizeDifficulty(meta.difficulty),
    domain: cbDomain as BankQuestion["domain"],
    skill: meta.primary_class_cd_desc ?? "",
    subskill: meta.skill_desc ?? null,
    source: SOURCE_LABEL,
    type: isMcq ? "multiple_choice" : "free_response",
    choices: isMcq ? choices : null,
  };
}

/* ------------------------------------------------------------------ main */

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const updateExisting = args.has("--update-existing");

  const existing = JSON.parse(fs.readFileSync(BANK_PATH, "utf8")) as BankQuestion[];
  const byId = new Map(existing.map((q) => [q.id, q]));
  console.log(`Current bank: ${existing.length} questions`);

  // 1. Catalogue every question id College Board currently publishes.
  const metas = new Map<string, CbMeta & { cbDomain: string }>();
  for (const d of DOMAINS) {
    process.stdout.write(`→ listing ${d.name} … `);
    try {
      const list = await fetchList(d.test, d.domain);
      for (const m of list) metas.set(m.questionId, { ...m, cbDomain: d.cbDomain });
      console.log(`${list.length}`);
    } catch (error) {
      console.error(`FAILED — ${error instanceof Error ? error.message : error}`);
    }
    await sleep(400);
  }
  console.log(`\nCollege Board catalogue: ${metas.size} unique question ids`);

  const missing = [...metas.values()].filter((m) => updateExisting || !byId.has(m.questionId));
  console.log(`Not in local bank: ${missing.length}`);
  if (missing.length === 0) {
    console.log("Nothing to do — the bank is already up to date.");
    return;
  }
  if (dryRun) {
    console.log("\n--dry-run: no files written. First 20 new ids:");
    console.log(missing.slice(0, 20).map((m) => m.questionId).join(", "));
    return;
  }

  // 2. Fetch and normalise only the missing questions.
  const added: BankQuestion[] = [];
  let failed = 0;
  for (let i = 0; i < missing.length; i++) {
    const meta = missing[i];
    process.stdout.write(`\r  fetching ${i + 1}/${missing.length} (${added.length} ok, ${failed} failed)   `);
    let qdata: Record<string, unknown> | null = null;
    if (meta.external_id) qdata = (await fetchQuestion(meta.external_id).catch(() => null)) as never;
    if (!qdata && meta.ibn) qdata = (await fetchDisclosed(meta.ibn)) as never;
    if (!qdata) {
      failed++;
      await sleep(60);
      continue;
    }
    const normalized = normalize(meta, qdata, meta.cbDomain);
    if (normalized) added.push(normalized);
    else failed++;
    await sleep(60);
  }
  console.log(`\n\nFetched ${added.length} new questions (${failed} could not be retrieved).`);
  if (added.length === 0) return;

  // 3. Merge — existing entries win unless --update-existing was passed.
  const merged = [...existing];
  for (const q of added) {
    const index = merged.findIndex((e) => e.id === q.id);
    if (index >= 0) {
      if (updateExisting) merged[index] = q;
    } else {
      merged.push(q);
    }
  }

  // 4. Back up, then write.
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = path.join(BACKUP_DIR, `question-bank-${stamp}.json`);
  fs.copyFileSync(BANK_PATH, backup);
  console.log(`Backed up previous bank → ${path.relative(process.cwd(), backup)}`);

  fs.writeFileSync(BANK_PATH, JSON.stringify(merged, null, 1) + "\n");
  console.log(`Wrote ${merged.length} questions → ${path.relative(process.cwd(), BANK_PATH)}`);
  console.log("\nNext:\n  npx tsx scripts/validate-question-bank.ts\n  npm run db:seed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
