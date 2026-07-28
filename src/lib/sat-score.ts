import type { AdaptivePath, SATQuestion, SkillBand } from "@/lib/types";

type GradeMap = Record<string, { correct: boolean; answer: string }>;

function roundToTen(value: number) {
  return Math.round(value / 10) * 10;
}

function sectionScore(
  module1: SATQuestion[],
  module2: SATQuestion[],
  grades: GradeMap,
  route: "easier" | "harder",
) {
  const ratio = (questions: SATQuestion[]) =>
    questions.length
      ? questions.filter((question) => grades[question.id]?.correct).length / questions.length
      : 0;
  const performance = ratio(module1) * 0.45 + ratio(module2) * 0.55;
  // College Board uses an undisclosed IRT/equating model. This practice estimate
  // keeps the official 200–800 range and gives a modest route adjustment.
  const routeAdjustment = route === "harder" ? 20 : -20;
  return Math.max(200, Math.min(800, roundToTen(200 + performance * 600 + routeAdjustment)));
}

function bandFor(correct: number, total: number) {
  const ratio = total ? correct / total : 0;
  if (ratio >= 0.85) return 5;
  if (ratio >= 0.7) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

function buildBands(questions: SATQuestion[], grades: GradeMap): SkillBand[] {
  const groups = new Map<string, { section: string; correct: number; total: number }>();
  for (const question of questions) {
    const current = groups.get(question.skill) ?? { section: question.domain, correct: 0, total: 0 };
    current.total += 1;
    if (grades[question.id]?.correct) current.correct += 1;
    groups.set(question.skill, current);
  }
  return Array.from(groups.entries()).map(([domain, result]) => ({
    domain,
    section: result.section,
    correct: result.correct,
    total: result.total,
    band: bandFor(result.correct, result.total),
  }));
}

export function estimateSatScore({
  rw1,
  rw2,
  math1,
  math2,
  grades,
  path,
}: {
  rw1: SATQuestion[];
  rw2: SATQuestion[];
  math1: SATQuestion[];
  math2: SATQuestion[];
  grades: GradeMap;
  path: AdaptivePath;
}) {
  const rwScore = sectionScore(rw1, rw2, grades, path.rw);
  const mathScore = sectionScore(math1, math2, grades, path.math);
  const questions = [...rw1, ...rw2, ...math1, ...math2];
  return {
    totalScore: rwScore + mathScore,
    rwScore,
    mathScore,
    skillBands: buildBands(questions, grades),
  };
}
