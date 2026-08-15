/**
 * Import newly released College Board SAT questions from a public mirror.
 *
 * Why this exists
 * ---------------
 * `scripts/cb-sync.ts` talks to `qbank-api.collegeboard.org` directly, which is
 * the preferred path. Some environments (CI, sandboxes, restricted networks)
 * cannot reach that host at all — the TCP connection is reset. This script is
 * the fallback: it reads an already-published snapshot of the question bank
 * from a public GitHub repository over the GitHub API and merges any questions
 * we don't already have.
 *
 * The mirror is only ever used to obtain College Board question *content*; the
 * canonical identity is still the College Board `questionId`, so a question
 * imported this way is the same row `cb-sync.ts` would have produced and the
 * two are interchangeable / idempotent with each other.
 *
 * Safety
 *  - Never overwrites an existing question (id is the primary key).
 *  - Backs up the current bank before writing.
 *  - Validates the mapped output (enum values, skill-belongs-to-domain,
 *    correctAnswer resolves to a real choice) and refuses to write if the
 *    merged bank would be invalid.
 *  - `--dry-run` reports exactly what would change and writes nothing.
 *
 * Usage
 *   npx tsx scripts/import-new-questions.ts --dry-run
 *   npx tsx scripts/import-new-questions.ts
 *   npx tsx scripts/import-new-questions.ts --file ./some-local-snapshot.json
 *   SOURCE_REPO=owner/name SOURCE_PATH=data/new_questions.json \
 *     npx tsx scripts/import-new-questions.ts
 */
import fs from "node:fs";
import path from "node:path";

/* ------------------------------------------------------------------ types */

type Choice = { key: string; text: string; html: string | null };

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

/** Shape published by the mirror (mirrors the College Board payload). */
type MirrorQuestion = {
  questionId: string;
  subject: string;
  domain: string;
  skill: string;
  difficulty: string;
  type: string;
  stimulus?: string | null;
  stem?: string | null;
  options?: { id: string; content: string }[] | null;
  correctAnswer: string;
  rationale?: string | null;
};

/* -------------------------------------------------------------- constants */

const BANK_PATH = path.join(process.cwd(), "src", "data", "question-bank.json");
const BACKUP_DIR = path.join(process.cwd(), "src", "data", "backups");
const SOURCE_LABEL = "College Board SAT Question Bank";

const SOURCE_REPO = process.env.SOURCE_REPO ?? "AYDXB09/blueprep-sat";
const SOURCE_PATH = process.env.SOURCE_PATH ?? "data/new_questions.json";
const SOURCE_REF = process.env.SOURCE_REF ?? "main";

const CHOICE_KEYS = ["A", "B", "C", "D", "E", "F"];

/** Canonical SAT taxonomy — the mapped output must land inside this. */
const SKILLS_BY_DOMAIN: Record<string, Set<string>> = {
  Math: new Set([
    "Algebra",
    "Advanced Math",
    "Problem-Solving and Data Analysis",
    "Geometry and Trigonometry",
  ]),
  "Reading & Writing": new Set([
    "Information and Ideas",
    "Craft and Structure",
    "Expression of Ideas",
    "Standard English Conventions",
  ]),
};

/* ---------------------------------------------------------------- helpers */

function toText(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Reading and Writing" (mirror) → "Reading & Writing" (our schema). */
function normalizeDomain(subject: string, domain: string): BankQuestion["domain"] | null {
  const s = subject.trim().toLowerCase();
  if (s === "math") return "Math";
  if (s.startsWith("reading")) return "Reading & Writing";
  // Fall back to inferring from the domain name when subject is unexpected.
  if (SKILLS_BY_DOMAIN.Math.has(domain)) return "Math";
  if (SKILLS_BY_DOMAIN["Reading & Writing"].has(domain)) return "Reading & Writing";
  return null;
}

function normalizeDifficulty(raw: string): BankQuestion["difficulty"] | null {
  const d = raw.trim();
  if (d === "Easy" || d === "E") return "Easy";
  if (d === "Medium" || d === "M") return "Medium";
  if (d === "Hard" || d === "H") return "Hard";
  return null;
}

/* ------------------------------------------------------------- conversion */

function convert(q: MirrorQuestion): { ok: true; value: BankQuestion } | { ok: false; reason: string } {
  const id = String(q.questionId ?? "").trim();
  if (!id) return { ok: false, reason: "missing questionId" };

  const domain = normalizeDomain(q.subject ?? "", q.domain ?? "");
  if (!domain) return { ok: false, reason: `unmappable subject/domain "${q.subject}"/"${q.domain}"` };

  // In our schema `skill` is the SAT domain (Algebra, …) and `subskill` is the
  // finer skill — which is the mirror's `domain` and `skill` respectively.
  const skill = (q.domain ?? "").trim();
  if (!SKILLS_BY_DOMAIN[domain].has(skill)) {
    return { ok: false, reason: `skill "${skill}" not valid for domain "${domain}"` };
  }

  const difficulty = normalizeDifficulty(q.difficulty ?? "");
  if (!difficulty) return { ok: false, reason: `bad difficulty "${q.difficulty}"` };

  const isMcq = String(q.type).toLowerCase() === "mcq";
  const stemHtml = q.stem ?? "";
  const stimulusHtml = q.stimulus ?? "";

  let choices: Choice[] | null = null;
  if (isMcq) {
    const options = q.options ?? [];
    if (options.length < 2) return { ok: false, reason: `mcq with ${options.length} option(s)` };
    // The mirror keeps options in presentation order and keys the answer by
    // letter, so positional letters are the correct mapping.
    choices = options.map((opt, index) => ({
      key: CHOICE_KEYS[index] ?? String(index),
      text: String(opt?.content ?? ""),
      html: null,
    }));
    if (choices.some((c) => !c.text.trim())) return { ok: false, reason: "an option has no content" };
  }

  const rawAnswer = String(q.correctAnswer ?? "").trim();
  if (!rawAnswer) return { ok: false, reason: "empty correctAnswer" };
  const correctAnswer = isMcq ? rawAnswer.toUpperCase() : rawAnswer;

  if (isMcq) {
    const keys = (choices ?? []).map((c) => c.key);
    const accepted = correctAnswer.split("|").map((p) => p.trim()).filter(Boolean);
    if (!accepted.some((a) => keys.includes(a))) {
      return { ok: false, reason: `correctAnswer "${correctAnswer}" is not one of ${keys.join(",")}` };
    }
  }

  const questionText = toText(stemHtml) || toText(stimulusHtml).slice(0, 400);
  if (!questionText) return { ok: false, reason: "no question text" };

  return {
    ok: true,
    value: {
      id,
      questionText,
      questionHtml: stemHtml || null,
      passage: stimulusHtml ? toText(stimulusHtml) : null,
      passageHtml: stimulusHtml || null,
      correctAnswer,
      explanation: q.rationale || null,
      difficulty,
      domain,
      skill,
      subskill: (q.skill ?? "").trim() || null,
      source: SOURCE_LABEL,
      type: isMcq ? "multiple_choice" : "free_response",
      choices,
    },
  };
}

/* ------------------------------------------------------------------ fetch */

async function loadSource(localFile: string | null): Promise<MirrorQuestion[]> {
  if (localFile) {
    console.log(`Reading local snapshot ${localFile}`);
    return JSON.parse(fs.readFileSync(localFile, "utf8"));
  }

  console.log(`Reading ${SOURCE_REPO}/${SOURCE_PATH}@${SOURCE_REF} via the GitHub API …`);
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  // The Contents API caps at 1 MB, so resolve the blob sha from the tree and
  // stream the raw blob instead.
  const treeRes = await fetch(
    `https://api.github.com/repos/${SOURCE_REPO}/git/trees/${SOURCE_REF}?recursive=1`,
    { headers },
  );
  if (!treeRes.ok) throw new Error(`tree: ${treeRes.status} ${await treeRes.text()}`);
  const tree = (await treeRes.json()) as { tree: { path: string; sha: string; type: string }[] };
  const entry = tree.tree.find((t) => t.path === SOURCE_PATH && t.type === "blob");
  if (!entry) throw new Error(`${SOURCE_PATH} not found in ${SOURCE_REPO}@${SOURCE_REF}`);

  const blobRes = await fetch(
    `https://api.github.com/repos/${SOURCE_REPO}/git/blobs/${entry.sha}`,
    { headers: { ...headers, Accept: "application/vnd.github.raw" } },
  );
  if (!blobRes.ok) throw new Error(`blob: ${blobRes.status}`);
  return (await blobRes.json()) as MirrorQuestion[];
}

/* ------------------------------------------------------------------- main */

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const fileIndex = argv.indexOf("--file");
  const localFile = fileIndex >= 0 ? argv[fileIndex + 1] ?? null : null;

  const existing = JSON.parse(fs.readFileSync(BANK_PATH, "utf8")) as BankQuestion[];
  const existingIds = new Set(existing.map((q) => q.id));
  console.log(`Current bank: ${existing.length} questions\n`);

  const source = await loadSource(localFile);
  console.log(`Source snapshot: ${source.length} questions`);

  const candidates = source.filter((q) => !existingIds.has(String(q.questionId ?? "").trim()));
  console.log(`Already present: ${source.length - candidates.length}`);
  console.log(`Candidates to import: ${candidates.length}\n`);

  if (candidates.length === 0) {
    console.log("Nothing to import — the bank is already up to date.");
    return;
  }

  const converted: BankQuestion[] = [];
  const rejected: { id: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const q of candidates) {
    const result = convert(q);
    if (!result.ok) {
      rejected.push({ id: String(q.questionId), reason: result.reason });
      continue;
    }
    // Guard against duplicates inside the source snapshot itself.
    if (seen.has(result.value.id)) {
      rejected.push({ id: result.value.id, reason: "duplicate within source" });
      continue;
    }
    seen.add(result.value.id);
    converted.push(result.value);
  }

  const byDomain = converted.reduce<Record<string, number>>((acc, q) => {
    acc[q.domain] = (acc[q.domain] ?? 0) + 1;
    return acc;
  }, {});
  const byDifficulty = converted.reduce<Record<string, number>>((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1;
    return acc;
  }, {});
  const byType = converted.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Mapped OK:  ${converted.length}`);
  console.log(`Rejected:   ${rejected.length}`);
  if (rejected.length) {
    rejected.slice(0, 10).forEach((r) => console.log(`   ${r.id}: ${r.reason}`));
  }
  console.log(`\n  by domain      ${JSON.stringify(byDomain)}`);
  console.log(`  by difficulty  ${JSON.stringify(byDifficulty)}`);
  console.log(`  by type        ${JSON.stringify(byType)}`);
  console.log(`  with rationale ${converted.filter((q) => q.explanation?.trim()).length}`);

  if (dryRun) {
    console.log("\n--dry-run: nothing written.");
    return;
  }
  if (converted.length === 0) {
    console.log("\nNo importable questions after mapping — nothing written.");
    return;
  }

  const merged = [...existing, ...converted];

  // Final safety net: ids must stay unique across the whole merged bank.
  const ids = new Set<string>();
  for (const q of merged) {
    if (ids.has(q.id)) throw new Error(`duplicate id after merge: ${q.id}`);
    ids.add(q.id);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = path.join(BACKUP_DIR, `question-bank-${stamp}.json`);
  fs.copyFileSync(BANK_PATH, backup);
  console.log(`\nBacked up previous bank → ${path.relative(process.cwd(), backup)}`);

  // Match the existing file's indentation exactly, so the diff shows only the
  // appended questions instead of reformatting all ~3.4k existing entries.
  fs.writeFileSync(BANK_PATH, JSON.stringify(merged, null, 2) + "\n");
  console.log(`Wrote ${merged.length} questions → ${path.relative(process.cwd(), BANK_PATH)}`);
  console.log("\nNext:\n  npx tsx scripts/validate-question-bank.ts\n  python3 scripts/build-catalog-stats.py\n  npm run db:seed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
