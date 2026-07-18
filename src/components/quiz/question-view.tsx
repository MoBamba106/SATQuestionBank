"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { SafeHtml } from "@/components/ui/safe-html";
import { cn } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

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
  const [draft, setDraft] = React.useState(selected ?? "");
  React.useEffect(() => setDraft(selected ?? ""), [selected, question.id]);

  return (
    <div className="space-y-4">
      {question.passageHtml && (
        <div className="glass-subtle max-h-[380px] overflow-y-auto p-4 sm:p-5 scrollbar-thin">
          <SafeHtml html={question.passageHtml} className="sat-content text-[14.5px] text-[#3a3833]" />
        </div>
      )}

      <SafeHtml html={question.questionHtml || question.questionText} className="sat-content" />

      {question.type === "multiple_choice" && question.choices ? (
        <div className="space-y-2.5 pt-1">
          {question.choices.map((c) => {
            const isSel = selected === c.key;
            const isAnswer = c.key.toUpperCase() === question.correctAnswer.toUpperCase();
            const wasCheckedWrong = graded && isSel && !isAnswer;
            return (
              <button
                key={c.key}
                disabled={lockSelection}
                onClick={() => onSelect(c.key)}
                className={cn(
                  "flex w-full items-start gap-3.5 rounded-2xl border-[1.5px] px-4 py-3 text-left transition-all duration-150",
                  !graded && !isSel && "border-[#e7e0d0] bg-white hover:border-[#b9c9f2] hover:bg-[#f7f9fe]",
                  !graded && isSel && "border-[#3a5fc8] bg-[#eef2fd] shadow-[0_0_0_3px_rgba(58,95,200,0.10)]",
                  graded && isAnswer && "border-[#2ca974] bg-[#ecf8f1]",
                  wasCheckedWrong && "border-[#d95670] bg-[#fdf0f2]",
                  graded && !isAnswer && !isSel && "border-[#e7e0d0] bg-white opacity-70",
                  lockSelection && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] font-mono text-[12.5px] font-bold transition-colors",
                    !graded && !isSel && "border-[#d5cfc0] bg-[#faf8f3] text-[#8a8680]",
                    !graded && isSel && "border-[#3a5fc8] bg-[#3a5fc8] text-white",
                    graded && isAnswer && "border-[#2ca974] bg-[#2ca974] text-white",
                    wasCheckedWrong && "border-[#d95670] bg-[#d95670] text-white",
                    graded && !isAnswer && !isSel && "border-[#e0d9c8] bg-white text-[#b0aa98]",
                  )}
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
          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">
            Your answer
          </label>
          <div className="flex max-w-sm items-center gap-3">
            <input
              className={cn(
                "input grow font-mono text-[15px]",
                graded && selected && selected.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
                  ? "border-[#2ca974] bg-[#ecf8f1]"
                  : graded
                    ? "border-[#d95670] bg-[#fdf0f2]"
                    : "",
              )}
              value={draft}
              disabled={lockSelection}
              placeholder="Type your answer…"
              onChange={(e) => {
                setDraft(e.target.value);
                onSelect(e.target.value);
              }}
            />
            {graded && (
              <span className="text-[13px] font-semibold text-[#238a5e]">Answer: {question.correctAnswer}</span>
            )}
          </div>
        </div>
      )}

      {graded && showExplanation && question.explanation && (
        <div className="rounded-2xl border border-[#cfe5d8] bg-[#f2faf5] p-4 sm:p-5">
          <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#238a5e]">Explanation</p>
          <SafeHtml html={question.explanation} className="sat-content text-[14px]" />
        </div>
      )}
    </div>
  );
}
