/**
 * Validate `src/data/question-bank.json`.
 *
 * Run after any import/merge (see `scripts/cb-sync.ts`) and in review:
 *
 *   npx tsx scripts/validate-question-bank.ts
 *
 * Checks
 *  - no duplicate ids
 *  - every required field present and non-empty
 *  - domain / difficulty / type are from the known enumerations
 *  - skill matches the domain it is filed under (so filters can't break)
 *  - multiple-choice questions have >= 2 choices, unique keys, and a
 *    correctAnswer that actually matches one of those keys
 *  - free-response questions have a non-empty answer key
 *
 * Exits non-zero when any error is found, so it can gate a data change.
 */
import fs from "node:fs";
import path from "node:path";

type Choice = { key: string; text: string; html?: string | null };
type BankQuestion = {
  id: string;
  questionText: string;
  questionHtml: string | null;
  passage: string | null;
  passageHtml: string | null;
  correctAnswer: string;
  explanation: string | null;
  difficulty: string;
  domain: string;
  skill: string;
  subskill: string | null;
  source: string | null;
  type: string;
  choices: Choice[] | null;
};

const BANK_PATH = path.join(process.cwd(), "src", "data", "question-bank.json");

const DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);
const TYPES = new Set(["multiple_choice", "free_response"]);
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

function main() {
  const raw = fs.readFileSync(BANK_PATH, "utf8");
  const bank = JSON.parse(raw) as BankQuestion[];

  if (!Array.isArray(bank)) {
    console.error("✖ question-bank.json is not an array");
    process.exit(1);
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, number>();

  const counts = {
    total: bank.length,
    byDomain: {} as Record<string, number>,
    byDifficulty: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    withExplanation: 0,
    withPassage: 0,
  };

  bank.forEach((q, index) => {
    const at = `#${index} (${q?.id ?? "no id"})`;

    if (!q || typeof q !== "object") {
      errors.push(`${at}: not an object`);
      return;
    }

    // --- identity ---------------------------------------------------------
    if (!q.id || typeof q.id !== "string") errors.push(`${at}: missing id`);
    else if (seen.has(q.id)) errors.push(`${at}: duplicate id (first seen at #${seen.get(q.id)})`);
    else seen.set(q.id, index);

    // --- required text ----------------------------------------------------
    if (!q.questionText?.trim() && !q.questionHtml?.trim() && !q.passageHtml?.trim()) {
      errors.push(`${at}: no question text, html, or passage`);
    }
    if (typeof q.correctAnswer !== "string" || !q.correctAnswer.trim()) {
      errors.push(`${at}: empty correctAnswer`);
    }

    // --- enumerations -----------------------------------------------------
    if (!DIFFICULTIES.has(q.difficulty)) errors.push(`${at}: bad difficulty "${q.difficulty}"`);
    if (!TYPES.has(q.type)) errors.push(`${at}: bad type "${q.type}"`);
    const domainSkills = SKILLS_BY_DOMAIN[q.domain];
    if (!domainSkills) {
      errors.push(`${at}: bad domain "${q.domain}"`);
    } else if (!domainSkills.has(q.skill)) {
      errors.push(`${at}: skill "${q.skill}" does not belong to domain "${q.domain}"`);
    }
    if (!q.subskill?.trim()) warnings.push(`${at}: no subskill (skill filters will skip it)`);
    if (!q.source?.trim()) warnings.push(`${at}: no source attribution`);

    // --- answers ----------------------------------------------------------
    if (q.type === "multiple_choice") {
      const choices = q.choices ?? [];
      if (choices.length < 2) {
        errors.push(`${at}: multiple_choice with ${choices.length} choice(s)`);
      } else {
        const keys = choices.map((c) => String(c?.key ?? "").toUpperCase());
        if (new Set(keys).size !== keys.length) errors.push(`${at}: duplicate choice keys ${keys.join(",")}`);
        if (choices.some((c) => !String(c?.text ?? c?.html ?? "").trim())) {
          errors.push(`${at}: a choice has no text`);
        }
        // The stored key must resolve to a real choice, otherwise grading and
        // the answer reveal are both wrong.
        const accepted = q.correctAnswer.split("|").map((p) => p.trim().toUpperCase()).filter(Boolean);
        if (accepted.length && !accepted.some((a) => keys.includes(a))) {
          errors.push(`${at}: correctAnswer "${q.correctAnswer}" is not one of ${keys.join(",")}`);
        }
      }
    } else if (q.choices && q.choices.length > 0) {
      warnings.push(`${at}: free_response but has choices`);
    }

    // --- tallies ----------------------------------------------------------
    counts.byDomain[q.domain] = (counts.byDomain[q.domain] ?? 0) + 1;
    counts.byDifficulty[q.difficulty] = (counts.byDifficulty[q.difficulty] ?? 0) + 1;
    counts.byType[q.type] = (counts.byType[q.type] ?? 0) + 1;
    if (q.explanation?.trim()) counts.withExplanation++;
    if (q.passageHtml?.trim()) counts.withPassage++;
  });

  console.log("Question bank summary");
  console.log("─".repeat(46));
  console.log(`  total              ${counts.total}`);
  console.log(`  unique ids         ${seen.size}`);
  console.log(`  by domain          ${JSON.stringify(counts.byDomain)}`);
  console.log(`  by difficulty      ${JSON.stringify(counts.byDifficulty)}`);
  console.log(`  by type            ${JSON.stringify(counts.byType)}`);
  console.log(`  with explanation   ${counts.withExplanation}`);
  console.log(`  with passage       ${counts.withPassage}`);
  console.log("");

  if (warnings.length) {
    console.log(`⚠ ${warnings.length} warning(s); first 10:`);
    warnings.slice(0, 10).forEach((w) => console.log(`   ${w}`));
    console.log("");
  }

  if (errors.length) {
    console.error(`✖ ${errors.length} error(s); first 25:`);
    errors.slice(0, 25).forEach((e) => console.error(`   ${e}`));
    process.exit(1);
  }

  console.log("✔ question bank is valid");
}

main();
