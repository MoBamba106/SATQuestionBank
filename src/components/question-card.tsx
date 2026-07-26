"use client";

import * as React from "react";
import { BookOpenCheck, Check, Square } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { SafeHtml } from "@/components/ui/safe-html";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { FavoriteButton } from "@/components/favorite-button";
import { AddToCollectionButton } from "@/components/add-to-collection";
import { cn, difficultyColor, stripHtml } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

type QuestionCardProps = {
  question: SATQuestion;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
};

function QuestionCardInner({
  question,
  selectable = false,
  selected = false,
  onSelect,
}: QuestionCardProps) {
  const [open, setOpen] = React.useState(false);
  const [reveal, setReveal] = React.useState(false);
  const snippet = stripHtml(question.questionHtml || question.questionText).slice(0, 190);

  const activateSelection = () => {
    if (selectable) onSelect?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectable || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    activateSelection();
  };

  return (
    <>
      <GlassCard
        className={cn(
          "flex h-full flex-col p-5",
          selectable && "cursor-pointer select-none",
          selected && "!border-[#315eaa] !bg-[#e8eef8] shadow-[inset_4px_0_0_#315eaa]",
          selectable && !selected && "hover:!border-[#8fa9cf] hover:!bg-[#f5f8fc]",
        )}
        hover={!selectable && !selected}
        onClick={selectable ? activateSelection : undefined}
        onKeyDown={handleKeyDown}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
        aria-pressed={selectable ? selected : undefined}
        aria-label={selectable ? `${selected ? "Deselect" : "Select"} question ${question.id}` : undefined}
      >
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="badge badge-blue">{question.domain}</span>
          <span className="badge">{question.skill}</span>
          <span className={cn("badge border", difficultyColor(question.difficulty))}>{question.difficulty}</span>
          {selectable ? (
            <span className={cn("ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold", selected ? "text-[#244b8c]" : "text-[#7b8085]")}>
              {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : <Square className="h-3.5 w-3.5" />}
              {selected ? "Selected" : "Select"}
            </span>
          ) : (
            <span className="ml-auto font-mono text-[10.5px] text-[#8c8f92]">#{question.id}</span>
          )}
        </div>

        {selectable ? (
          <div className="grow text-left">
            <p className="line-clamp-3 text-[13.5px] leading-relaxed text-[#3f454b]">
              {snippet || "View question"}
              {question.passageHtml && <span className="ml-1 text-[#7b8085]">(with passage)</span>}
            </p>
          </div>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="grow text-left">
            <p className="line-clamp-3 text-[13.5px] leading-relaxed text-[#3f454b]">
              {snippet || "View question"}
              {question.passageHtml && <span className="ml-1 text-[#7b8085]">(with passage)</span>}
            </p>
          </button>
        )}

        <div className={cn("mt-4 flex min-h-9 items-center justify-between border-t pt-3", selected ? "border-[#c5d3e9]" : "border-[#e6e1d7]")}>
          {selectable ? (
            <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold", selected ? "text-[#244b8c]" : "text-[#555b62]")}>
              {selected ? <Check className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {selected ? "Included in quiz" : "Click card to include"}
            </span>
          ) : (
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#315eaa] hover:underline">
              <BookOpenCheck className="h-3.5 w-3.5" /> Open question
            </button>
          )}

          {!selectable && (
            <div className="flex items-center">
              {question.timesAnswered > 0 && (
                <span className="mr-2 text-[11px] font-medium text-[#7b8085]">
                  {question.timesCorrect}/{question.timesAnswered} right
                </span>
              )}
              <FavoriteButton questionId={question.id} favorite={question.favorite} size="sm" />
              <AddToCollectionButton questionId={question.id} size="sm" />
            </div>
          )}
        </div>
      </GlassCard>

      {!selectable && (
        <PaperDialog
          open={open}
          onOpenChange={setOpen}
          wide
          title={
            <span className="flex flex-wrap items-center gap-2 text-base">
              <span className="badge badge-blue">{question.domain}</span>
              <span className="badge">{question.skill}</span>
              {question.subskill && <span className="badge">{question.subskill}</span>}
              <span className={cn("badge border", difficultyColor(question.difficulty))}>{question.difficulty}</span>
            </span>
          }
        >
          <div className="mt-4 max-h-[62vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
            {question.passageHtml && (
              <div className="glass-subtle p-4">
                <SafeHtml html={question.passageHtml} className="sat-content text-[14.5px]" />
              </div>
            )}
            <SafeHtml html={question.questionHtml || question.questionText} className="sat-content" />
            {question.choices && question.choices.length > 0 && (
              <div className="space-y-2">
                {question.choices.map((choice) => (
                  <div
                    key={choice.key}
                    className={cn(
                      "flex gap-3 rounded-[6px] border px-4 py-2.5",
                      reveal && choice.key.toUpperCase() === question.correctAnswer.toUpperCase()
                        ? "border-[#76ad91] bg-[#edf7f1]"
                        : "border-[#d4cfc3] bg-white",
                    )}
                  >
                    <span className="mt-0.5 font-mono text-[13px] font-bold text-[#7b8085]">{choice.key})</span>
                    <SafeHtml html={choice.html || choice.text} className="sat-content grow text-[14.5px]" />
                  </div>
                ))}
              </div>
            )}
            {reveal ? (
              <div className="rounded-[6px] border border-[#bad6c7] bg-[#f2faf5] p-4">
                <p className="mb-1 text-[12px] font-bold uppercase tracking-wide text-[#287a55]">
                  Correct answer: {question.correctAnswer}
                </p>
                <SafeHtml html={question.explanation} className="sat-content text-[14px]" />
              </div>
            ) : (
              <button type="button" className="btn btn-soft w-full" onClick={() => setReveal(true)}>
                Reveal answer and explanation
              </button>
            )}
          </div>
        </PaperDialog>
      )}
    </>
  );
}

export const QuestionCard = React.memo(QuestionCardInner);
