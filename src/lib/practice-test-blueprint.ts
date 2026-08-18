/**
 * Digital SAT practice-test blueprint.
 *
 * Domain counts, module order, SPR share, and adaptive difficulty follow the
 * College Board Assessment Framework for the digital SAT:
 *   R&W  2 × 27  — Information and Ideas, Craft and Structure,
 *                  Expression of Ideas, Standard English Conventions
 *   Math 2 × 22  — Algebra / Advanced Math / PSDA / Geometry
 *                  ~25% student-produced response
 *   Math items run easiest → hardest; R&W is grouped by domain, easiest → hardest
 *   inside each group.
 *
 * Bump PRACTICE_TEST_BLUEPRINT_VERSION when the mix changes so already-seeded
 * databases rebuild the official tests.
 */

export const PRACTICE_TEST_BLUEPRINT_VERSION = 2;

export type ModuleKind = "routing" | "easier" | "harder";
export type Diff = "Easy" | "Medium" | "Hard";

export type BlueprintQuestion = {
  id: string;
  difficulty: string;
  skill: string;
  domain: string;
  type: string;
  subskill?: string | null;
  passage?: string | null;
  questionText?: string | null;
};

export type BuiltModules<T extends BlueprintQuestion> = {
  rw1: T[];
  rw2_easy: T[];
  rw2_hard: T[];
  math1: T[];
  math2_easy: T[];
  math2_hard: T[];
};

type Mix = Record<Diff, number>;

/** Official R&W domain order and per-module counts (7+7+6+7 = 27). */
export const RW_MODULE_SKILLS: [string, number][] = [
  ["Information and Ideas", 7],
  ["Craft and Structure", 7],
  ["Expression of Ideas", 6],
  ["Standard English Conventions", 7],
];

/**
 * Math domain counts differ slightly between Module 1 and Module 2 so the
 * two-module total lands on the official 15 / 15 / 7 / 7 split.
 */
export const MATH_MODULE1_SKILLS: [string, number][] = [
  ["Algebra", 8],
  ["Advanced Math", 7],
  ["Problem-Solving and Data Analysis", 4],
  ["Geometry and Trigonometry", 3],
];
export const MATH_MODULE2_SKILLS: [string, number][] = [
  ["Algebra", 7],
  ["Advanced Math", 8],
  ["Problem-Solving and Data Analysis", 3],
  ["Geometry and Trigonometry", 4],
];

/** Combined skill list used to build per-skill pools. */
export const ALL_BLUEPRINT_SKILLS = [
  ...RW_MODULE_SKILLS.map(([skill]) => skill),
  ...MATH_MODULE1_SKILLS.map(([skill]) => skill),
];

/**
 * Adaptive difficulty. Module 1 is a real routing mix (not an easy drill).
 * The harder Module 2 is majority-Hard, matching how Bluebook feels after a
 * strong Module 1. The easier Module 2 stays mostly Easy/Medium.
 */
const RW_MIX: Record<ModuleKind, Mix> = {
  routing: { Easy: 6, Medium: 11, Hard: 10 },
  easier: { Easy: 12, Medium: 12, Hard: 3 },
  harder: { Easy: 1, Medium: 8, Hard: 18 },
};
const MATH_MIX: Record<ModuleKind, Mix> = {
  routing: { Easy: 5, Medium: 9, Hard: 8 },
  easier: { Easy: 10, Medium: 10, Hard: 2 },
  harder: { Easy: 1, Medium: 6, Hard: 15 },
};

/** SPR targets so a student who sits Module 1 + one Module 2 sees ~11 / 44. */
const SPR_TARGET: Record<ModuleKind, number> = {
  routing: 5,
  easier: 6,
  harder: 6,
};

const DIFF_RANK: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
const DIFFS: Diff[] = ["Easy", "Medium", "Hard"];

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function officialReleaseLabel(testNumber: number) {
  return `Format-matched to Bluebook Test ${testNumber} · official bank · blueprint ${PRACTICE_TEST_BLUEPRINT_VERSION}`;
}

function normalizeDiff(value: string): Diff {
  if (value === "Easy" || value === "Hard") return value;
  return "Medium";
}

function isSpr(question: BlueprintQuestion) {
  return question.type === "free_response";
}

function isCrossText(question: BlueprintQuestion) {
  return (question.subskill ?? "").toLowerCase().includes("cross-text");
}

function isPoetry(question: BlueprintQuestion) {
  const blob = `${question.passage ?? ""} ${question.questionText ?? ""}`.toLowerCase();
  return blob.includes("poem") || blob.includes("poet") || blob.includes("stanza");
}

/** When the exact difficulty is gone, step toward the module's intended hardness. */
function fallbackOrder(wanted: Diff, kind: ModuleKind): Diff[] {
  if (kind === "easier") {
    if (wanted === "Easy") return ["Easy", "Medium", "Hard"];
    if (wanted === "Medium") return ["Medium", "Easy", "Hard"];
    return ["Hard", "Medium", "Easy"];
  }
  if (wanted === "Hard") return ["Hard", "Medium", "Easy"];
  if (wanted === "Medium") return ["Medium", "Hard", "Easy"];
  return ["Easy", "Medium", "Hard"];
}

function allocateMix(skills: [string, number][], mix: Mix): Map<string, Mix> {
  const total = skills.reduce((sum, [, count]) => sum + count, 0);
  const result = new Map<string, Mix>();
  const needed: Mix = { ...mix };

  for (const [skill, count] of skills) {
    const alloc: Mix = { Easy: 0, Medium: 0, Hard: 0 };
    for (const diff of DIFFS) {
      alloc[diff] = Math.floor((count * mix[diff]) / total);
      needed[diff] -= alloc[diff];
    }
    result.set(skill, alloc);
  }

  const skillCap = new Map(skills);
  const room = (skill: string) => {
    const alloc = result.get(skill)!;
    return skillCap.get(skill)! - (alloc.Easy + alloc.Medium + alloc.Hard);
  };

  // Give leftover difficulty slots to the skills with the most remaining room,
  // preferring Hard so routing/harder modules stay hard.
  for (const diff of ["Hard", "Medium", "Easy"] as Diff[]) {
    while (needed[diff] > 0) {
      let best: string | null = null;
      let bestRoom = 0;
      for (const [skill] of skills) {
        const open = room(skill);
        if (open > bestRoom) {
          best = skill;
          bestRoom = open;
        }
      }
      if (!best) break;
      result.get(best)![diff] += 1;
      needed[diff] -= 1;
    }
  }

  for (const [skill, count] of skills) {
    const alloc = result.get(skill)!;
    while (alloc.Easy + alloc.Medium + alloc.Hard < count) {
      const diff = (["Hard", "Medium", "Easy"] as Diff[]).find((item) => needed[item] > 0) ?? "Medium";
      alloc[diff] += 1;
      if (needed[diff] > 0) needed[diff] -= 1;
    }
  }

  return result;
}

function pickForSkill<T extends BlueprintQuestion>(
  pool: T[],
  used: Set<string>,
  plan: Mix,
  kind: ModuleKind,
  opts: { sprRemaining: number; slotsLeft: number; preferCrossText: boolean; preferPoetry: boolean },
): T[] | null {
  const picked: T[] = [];
  const usedSubskills = new Set<string>();
  let sprRemaining = opts.sprRemaining;
  let slotsLeft = opts.slotsLeft;
  let wantCrossText = opts.preferCrossText;
  let wantPoetry = opts.preferPoetry;

  const take = (wanted: Diff) => {
    const needSpr = sprRemaining > 0 && sprRemaining >= slotsLeft;
    const likeSpr = sprRemaining > 0 && slotsLeft > 0 && sprRemaining / slotsLeft >= 0.2;
    let best: T | null = null;
    let bestScore = -Infinity;

    for (const question of pool) {
      if (used.has(question.id)) continue;
      const diff = normalizeDiff(question.difficulty);
      const order = fallbackOrder(wanted, kind);
      const diffIdx = order.indexOf(diff);
      if (diffIdx < 0) continue;

      let score = 40 - diffIdx * 18;
      if (diff === wanted) score += 24;
      const sub = (question.subskill ?? "").trim();
      if (sub && !usedSubskills.has(sub)) score += 8;
      if (needSpr) score += isSpr(question) ? 30 : -25;
      else if (likeSpr && isSpr(question)) score += 10;
      else if (sprRemaining <= 0 && isSpr(question)) score -= 14;
      if (wantCrossText && isCrossText(question)) score += 16;
      if (wantPoetry && isPoetry(question)) score += 7;

      if (score > bestScore) {
        best = question;
        bestScore = score;
      }
    }

    if (!best) return false;
    used.add(best.id);
    picked.push(best);
    slotsLeft -= 1;
    if (isSpr(best)) sprRemaining -= 1;
    const sub = (best.subskill ?? "").trim();
    if (sub) usedSubskills.add(sub);
    if (isCrossText(best)) wantCrossText = false;
    if (isPoetry(best)) wantPoetry = false;
    return true;
  };

  // Draw Hard first so easier leftovers cannot starve the hard quota.
  for (const diff of ["Hard", "Medium", "Easy"] as Diff[]) {
    for (let i = 0; i < plan[diff]; i++) {
      if (!take(diff)) return null;
    }
  }
  return picked;
}

function orderModule<T extends BlueprintQuestion>(picked: T[], isMath: boolean, skills: [string, number][]) {
  if (isMath) {
    return [...picked].sort((a, b) => (DIFF_RANK[normalizeDiff(a.difficulty)] ?? 1) - (DIFF_RANK[normalizeDiff(b.difficulty)] ?? 1));
  }
  const order = skills.map(([skill]) => skill);
  return [...picked].sort((a, b) => {
    const skillDelta = order.indexOf(a.skill) - order.indexOf(b.skill);
    if (skillDelta !== 0) return skillDelta;
    return (DIFF_RANK[normalizeDiff(a.difficulty)] ?? 1) - (DIFF_RANK[normalizeDiff(b.difficulty)] ?? 1);
  });
}

function buildModule<T extends BlueprintQuestion>(
  pools: Map<string, T[]>,
  used: Set<string>,
  skills: [string, number][],
  kind: ModuleKind,
  isMath: boolean,
): T[] | null {
  const mix = isMath ? MATH_MIX[kind] : RW_MIX[kind];
  const plan = allocateMix(skills, mix);
  const out: T[] = [];
  let sprRemaining = isMath ? SPR_TARGET[kind] : 0;
  let slotsLeft = skills.reduce((sum, [, count]) => sum + count, 0);

  for (const [skill, count] of skills) {
    const skillPlan = plan.get(skill);
    if (!skillPlan || skillPlan.Easy + skillPlan.Medium + skillPlan.Hard !== count) return null;
    const picked = pickForSkill(pools.get(skill) ?? [], used, skillPlan, kind, {
      sprRemaining,
      slotsLeft,
      preferCrossText: skill === "Craft and Structure",
      preferPoetry: skill === "Information and Ideas" || skill === "Craft and Structure",
    });
    if (!picked) return null;
    sprRemaining -= picked.filter(isSpr).length;
    slotsLeft -= picked.length;
    out.push(...picked);
  }

  return orderModule(out, isMath, skills);
}

/**
 * Assemble all six adaptive modules for one practice test.
 * Questions are unique within the test. Returns null if the bank is too thin.
 */
export function buildPracticeTestModules<T extends BlueprintQuestion>(
  bank: T[],
  rnd: () => number,
): BuiltModules<T> | null {
  const pools = new Map<string, T[]>();
  for (const skill of ALL_BLUEPRINT_SKILLS) {
    pools.set(skill, shuffled(bank.filter((question) => question.skill === skill), rnd));
  }
  const used = new Set<string>();
  const rw1 = buildModule(pools, used, RW_MODULE_SKILLS, "routing", false);
  const rw2Easy = buildModule(pools, used, RW_MODULE_SKILLS, "easier", false);
  const rw2Hard = buildModule(pools, used, RW_MODULE_SKILLS, "harder", false);
  const math1 = buildModule(pools, used, MATH_MODULE1_SKILLS, "routing", true);
  const math2Easy = buildModule(pools, used, MATH_MODULE2_SKILLS, "easier", true);
  const math2Hard = buildModule(pools, used, MATH_MODULE2_SKILLS, "harder", true);
  if (!rw1 || !rw2Easy || !rw2Hard || !math1 || !math2Easy || !math2Hard) return null;
  return {
    rw1,
    rw2_easy: rw2Easy,
    rw2_hard: rw2Hard,
    math1,
    math2_easy: math2Easy,
    math2_hard: math2Hard,
  };
}
