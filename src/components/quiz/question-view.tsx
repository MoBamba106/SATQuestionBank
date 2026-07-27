"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { SafeHtml } from "@/components/ui/safe-html";
import { answersMatch, cn, resolveCorrectAnswer } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

/** Pretty-print accepted keys like "0|3" → "0 or 3". */
function formatAcceptedAnswer(answer: string): string {
  const parts = String(answer || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return answer || "—";
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, or ${parts.at(-1)}`;
}

/**
 * Shared question renderer used by practice, exam and Bluebook modes.
 * `graded` (true once "Check Answer" has run) reveals correct/incorrect
 * styling plus the explanation panel.
 */
export function QuestionView({
  question,
  selected,
  onSelect,
  graded,
  lockSelection,
  showExplanation = true,
}: {
  question: SATQuestion;
  selected: string | undefined;
  onSelect: (answer: string) => void;
  graded: boolean;
  lockSelection?: boolean;
  showExplanation?: boolean;
}) {
  const correctKey = resolveCorrectAnswer(question.correctAnswer, question.explanation);

  return (
    <div className="space-y-4">
      {question.passageHtml && (
        <div className="glass-subtle max-h-[380px] overflow-y-auto p-4 sm:p-5 scrollbar-thin">
          <SafeHtml html={question.passageHtml} className="sat-content text-[14.5px] text-[var(--ink-soft)]" />
        </div>
      )}

      <SafeHtml html={question.questionHtml || question.questionText} className="sat-content" />

      {question.type === "multiple_choice" && question.choices ? (
        <div className="space-y-2.5 pt-1">
          {question.choices.map((c) => {
            const isSel = selected === c.key;
            const isAnswer = c.key.toUpperCase() === correctKey.toUpperCase();
            const wasCheckedWrong = graded && isSel && !isAnswer;
            const answerState = graded
              ? isAnswer ? "correct" : wasCheckedWrong ? "wrong" : "muted"
              : isSel ? "selected" : "idle";
            return (
              <button
                key={c.key}
                disabled={lockSelection}
                onClick={() => onSelect(c.key)}
                data-answer-state={answerState}
                className={cn(
                  "answer-choice flex w-full items-start gap-3.5 rounded-[6px] border px-4 py-3 text-left transition-colors duration-150",
                  lockSelection && "cursor-default",
                )}
              >
                <span
                  data-answer-state={answerState}
                  className="answer-letter mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12.5px] font-bold transition-colors"
                >
                  {c.key}
                </span>
                <div className="grow">
                  <SafeHtml html={c.html || c.text} className="sat-content text-[15px]" />
                </div>
                {graded && isAnswer && <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#2ca974]" />}
                {wasCheckedWrong && <XCircle className="mt-1 h-5 w-5 shrink-0 text-[#d95670]" />}
              </button>
            );
          })}
        </div>
      ) : (
        // free response (student-produced response)
        <div className="pt-1">
          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
            Your answer
          </label>
          <div className="flex max-w-sm items-center gap-3">
            <input
              className={cn(
                "input grow font-mono text-[15px]",
                graded && selected && answersMatch(selected, correctKey)
                  ? "answer-input-correct"
                  : graded
                    ? "answer-input-wrong"
                    : "",
              )}
              value={selected ?? ""}
              disabled={lockSelection}
              placeholder="Type your answer…"
              onChange={(e) => onSelect(e.target.value)}
            />
            {graded && (
              <span className="text-[13px] font-semibold text-[#238a5e]">
                Answer: {formatAcceptedAnswer(correctKey)}
              </span>
            )}
          </div>
        </div>
      )}

      {graded && showExplanation && question.explanation && (
        <div className="answer-explanation rounded-[6px] border p-4 sm:p-5">
          <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#238a5e]">Explanation</p>
          <SafeHtml html={question.explanation} className="sat-content text-[14px]" />
        </div>
      )}
    </div>
  );
}
