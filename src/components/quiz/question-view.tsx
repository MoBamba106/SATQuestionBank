"use client";

import * as React from "react";
import { Ban, CheckCircle2, XCircle } from "lucide-react";
import { SafeHtml } from "@/components/ui/safe-html";
import { useSettings } from "@/components/settings-provider";
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
 *
 * Choices support:
 *  - unclick: selecting the current answer again clears it
 *  - eliminate: the strike-through button crosses out a choice and locks it
 *    until it is un-eliminated
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
  const { settings } = useSettings();
  const correctKey = resolveCorrectAnswer(question.correctAnswer, question.explanation);
  const expandPassages = settings.expandPassages;
  const [eliminated, setEliminated] = React.useState<Record<string, boolean>>({});
  const [prevQuestionId, setPrevQuestionId] = React.useState(question.id);

  // Reset eliminations when the question changes.
  if (prevQuestionId !== question.id) {
    setPrevQuestionId(question.id);
    setEliminated({});
  }

  const toggleEliminate = (key: string) => {
    if (lockSelection || graded) return;
    setEliminated((current) => {
      const next = { ...current, [key]: !current[key] };
      // Eliminating a selected answer also unselects it.
      if (next[key] && selected === key) onSelect("");
      return next;
    });
  };

  const pick = (key: string) => {
    if (eliminated[key]) return;
    // Clicking the already-selected choice unclicks it.
    onSelect(selected === key ? "" : key);
  };

  return (
    <div className="space-y-4">
      {question.passageHtml && (
        <div
          className={cn(
            "glass-subtle p-4 sm:p-5 scrollbar-thin",
            expandPassages ? "overflow-visible" : "max-h-[380px] overflow-y-auto",
          )}
        >
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
            const isEliminated = !graded && !!eliminated[c.key];
            const answerState = graded
              ? isAnswer ? "correct" : wasCheckedWrong ? "wrong" : "muted"
              : isSel ? "selected" : "idle";
            return (
              <div key={c.key} className="flex items-start gap-1.5">
                <button
                  disabled={lockSelection || isEliminated}
                  onClick={() => pick(c.key)}
                  data-answer-state={answerState}
                  aria-pressed={isSel}
                  className={cn(
                    "answer-choice flex w-full items-start gap-3.5 rounded-[6px] border px-4 py-3 text-left transition-colors duration-150",
                    lockSelection && "cursor-default",
                    isEliminated && "answer-eliminated cursor-not-allowed",
                  )}
                >
                  <span
                    data-answer-state={answerState}
                    className="answer-letter mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12.5px] font-bold transition-colors"
                  >
                    {c.key}
                  </span>
                  <div className="answer-choice-body grow">
                    <SafeHtml html={c.html || c.text} className="sat-content text-[15px]" />
                  </div>
                  {graded && isAnswer && <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#2ca974]" />}
                  {wasCheckedWrong && <XCircle className="mt-1 h-5 w-5 shrink-0 text-[#d95670]" />}
                </button>
                {!graded && !lockSelection && (
                  <button
                    type="button"
                    onClick={() => toggleEliminate(c.key)}
                    title={isEliminated ? `Undo eliminate ${c.key}` : `Eliminate choice ${c.key}`}
                    aria-label={isEliminated ? `Undo eliminate choice ${c.key}` : `Eliminate choice ${c.key}`}
                    aria-pressed={isEliminated}
                    className={cn(
                      "mt-2 shrink-0 rounded-[5px] p-1.5 transition-colors",
                      isEliminated
                        ? "bg-[color-mix(in_srgb,var(--bad)_14%,var(--paper-raised))] text-[var(--bad)]"
                        : "text-[var(--ink-faint)] hover:bg-[var(--paper-soft)] hover:text-[var(--bad)]",
                    )}
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
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
