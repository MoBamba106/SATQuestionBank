import { answersMatch, resolveCorrectAnswer } from "@/lib/utils";
import type { AdaptiveRoute, SATQuestion } from "@/lib/types";

/**
 * Digital SAT-style routing rule. Module 1 is the routing module; earning at
 * least 60% sends the student to the harder second module. Skips count as
 * incorrect, matching timed-test scoring.
 */
export const ADAPTIVE_HARD_ROUTE_THRESHOLD = 0.6;

export function scoreModule(
  questions: SATQuestion[],
  answers: Record<string, string>,
): { correct: number; total: number; ratio: number; route: AdaptiveRoute } {
  const correct = questions.reduce((sum, question) => {
    const answer = answers[question.id];
    return sum + (answer && answersMatch(answer, resolveCorrectAnswer(question.correctAnswer, question.explanation)) ? 1 : 0);
  }, 0);
  const total = questions.length;
  const ratio = total > 0 ? correct / total : 0;
  return {
    correct,
    total,
    ratio,
    route: ratio >= ADAPTIVE_HARD_ROUTE_THRESHOLD ? "harder" : "easier",
  };
}
