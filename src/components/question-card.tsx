"use client";

import * as React from "react";
import { BookOpenCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { SafeHtml } from "@/components/ui/safe-html";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { FavoriteButton } from "@/components/favorite-button";
import { AddToCollectionButton } from "@/components/add-to-collection";
import { cn, difficultyColor, stripHtml } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

function QuestionCardInner({ question }: { question: SATQuestion }) {
  const [open, setOpen] = React.useState(false);
  const [reveal, setReveal] = React.useState(false);
  const snippet = stripHtml(question.questionHtml || question.questionText).slice(0, 190);

  return (
    <>
      <GlassCard className="flex h-full flex-col p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="badge badge-blue">{question.domain}</span>
          <span className="badge">{question.skill}</span>
          <span className={cn("badge border", difficultyColor(question.difficulty))}>{question.difficulty}</span>
          <span className="ml-auto font-mono text-[10.5px] text-[#b0aa98]">#{question.id}</span>
        </div>
        <button onClick={() => setOpen(true)} className="grow text-left">
          <p className="line-clamp-3 text-[13.5px] leading-relaxed text-[#44413a]">
            {snippet || "View question"}
            {question.passageHtml && <span className="ml-1 text-[#8a8680]">(with passage)</span>}
          </p>
        </button>
        <div className="mt-4 flex items-center justify-between border-t border-[#f0ead9] pt-3">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3a5fc8] hover:text-[#2c4aa5]"
          >
            <BookOpenCheck className="h-3.5 w-3.5" /> Open
          </button>
          <div className="flex items-center">
            {question.timesAnswered > 0 && (
              <span className="mr-2 text-[11px] font-medium text-[#8a8680]">
                {question.timesCorrect}/{question.timesAnswered} right
              </span>
            )}
            <FavoriteButton questionId={question.id} favorite={question.favorite} size="sm" />
            <AddToCollectionButton questionId={question.id} size="sm" />
          </div>
        </div>
      </GlassCard>

      <PaperDialog open={open} onOpenChange={setOpen} wide title={
        <span className="flex flex-wrap items-center gap-2 text-base">
          <span className="badge badge-blue">{question.domain}</span>
          <span className="badge">{question.skill}</span>
          {question.subskill && <span className="badge">{question.subskill}</span>}
          <span className={cn("badge border", difficultyColor(question.difficulty))}>{question.difficulty}</span>
        </span>
      }>
        <div className="mt-4 max-h-[62vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
          {question.passageHtml && (
            <div className="glass-subtle p-4">
              <SafeHtml html={question.passageHtml} className="sat-content text-[14.5px]" />
            </div>
          )}
          <SafeHtml html={question.questionHtml || question.questionText} className="sat-content" />
          {question.choices && question.choices.length > 0 && (
            <div className="space-y-2">
              {question.choices.map((c) => (
                <div
                  key={c.key}
                  className={cn(
                    "flex gap-3 rounded-xl border-[1.5px] px-4 py-2.5",
                    reveal && c.key.toUpperCase() === question.correctAnswer.toUpperCase()
                      ? "border-[#2ca974] bg-[#ecf8f1]"
                      : "border-[#e7e0d0] bg-white",
                  )}
                >
                  <span className="mt-0.5 font-mono text-[13px] font-bold text-[#8a8680]">{c.key})</span>
                  <SafeHtml html={c.html || c.text} className="sat-content grow text-[14.5px]" />
                </div>
              ))}
            </div>
          )}
          {reveal ? (
            <div className="rounded-xl border border-[#cfe5d8] bg-[#f2faf5] p-4">
              <p className="mb-1 text-[12px] font-bold uppercase tracking-wide text-[#238a5e]">
                Correct answer: {question.correctAnswer}
              </p>
              <SafeHtml html={question.explanation} className="sat-content text-[14px]" />
            </div>
          ) : (
            <button className="btn btn-soft w-full" onClick={() => setReveal(true)}>
              Reveal answer & explanation
            </button>
          )}
        </div>
      </PaperDialog>
    </>
  );
}

export const QuestionCard = React.memo(QuestionCardInner);
