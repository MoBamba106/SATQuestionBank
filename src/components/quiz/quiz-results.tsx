"use client";

import * as React from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Trophy, RotateCcw, LayoutDashboard, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, X, Eye, Maximize2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { QuestionView } from "@/components/quiz/question-view";
import { cn, difficultyColor, domainColor, skillColor, stripHtml } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

export type GradedMap = Record<string, { correct: boolean; answer: string }>;

function ImageLightbox({ content, onClose }: { content: { type: "img"; src: string } | { type: "svg"; html: string } | null; onClose: () => void }) {
  if (!content) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={onClose} aria-label="Close">
        <X className="h-5 w-5" />
      </button>
      <div className="max-h-[90vh] max-w-[95vw] overflow-auto rounded-[8px] bg-[var(--paper-raised)] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {content.type === "img" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.src} alt="Enlarged graph" className="h-auto max-h-[85vh] w-auto max-w-[90vw] object-contain" />
        ) : (
          <div className="flex items-center justify-center bg-[#f7f6f2] p-6 rounded-[6px] min-w-[320px] min-h-[320px]" dangerouslySetInnerHTML={{ __html: content.html }} />
        )}
      </div>
    </div>
  );
}

export function QuizResults({
  pool,
  answers,
  graded,
  label,
  onRetryMissed,
  onNewQuiz,
  extra,
}: {
  pool: SATQuestion[];
  answers: Record<string, string>;
  graded: GradedMap;
  label: string;
  onRetryMissed?: () => void;
  onNewQuiz: () => void;
  extra?: React.ReactNode;
}) {
  const [review, setReview] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [lightbox, setLightbox] = React.useState<{ type: "img"; src: string } | { type: "svg"; html: string } | null>(null);

  const answered = pool.filter((q) => answers[q.id] && String(answers[q.id]).trim() !== "");
  const correctCount = pool.filter((q) => graded[q.id]?.correct).length;
  const incorrectCount = answered.length - correctCount;
  const unanswered = pool.length - answered.length;
  const pct = pool.length ? Math.round((correctCount / pool.length) * 100) : 0;
  const missed = pool.filter((q) => answers[q.id] && !graded[q.id]?.correct);

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pieData = [
    { name: "Correct", value: correctCount, fill: "#2ca974" },
    { name: "Incorrect", value: Math.max(0, incorrectCount), fill: "#e56a8a" },
    { name: "Unanswered", value: Math.max(0, unanswered), fill: "#d8cfbd" },
  ].filter((d) => d.value > 0);

  const bySkill = Object.entries(
    pool.reduce((acc, q) => {
      const k = q.skill;
      if (!acc[k]) acc[k] = { total: 0, correct: 0 };
      acc[k].total++;
      if (graded[q.id]?.correct) acc[k].correct++;
      return acc;
    }, {} as Record<string, { total: number; correct: number }>),
  ).map(([skill, v]) => ({ skill: skill.length > 22 ? skill.slice(0, 21) + "…" : skill, pct: v.total ? Math.round((v.correct / v.total) * 100) : 0 }));

  return (
    <div className="space-y-5">
      <GlassCard hover={false} className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[7px] border border-[#dfc27c] bg-[#f8ecd0]">
            <Trophy className="h-7 w-7 text-[#8a5c1f]" />
          </div>
          <h2 className="font-display mt-4 text-3xl font-bold text-[var(--ink)]">
            {pct >= 80 ? "Congratulations!" : pct >= 60 ? "Nice work!" : "Quiz complete"}
          </h2>
          <p className="mt-1 text-[15px] text-[var(--ink-faint)]">{label}</p>
          <p className="mt-3 text-[17px] font-semibold text-[var(--ink)]">
            You scored <span className="hl-yellow px-1 text-[var(--ink)]">{correctCount} / {pool.length}</span> ({pct}%)
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="relative mx-auto h-[220px] w-full max-w-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 13, color: "var(--ink)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold text-[var(--ink)]">{pct}%</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">score</span>
            </div>
          </div>

          <div className="space-y-3 self-center">
            <div className="flex items-center gap-3 rounded-[6px] bg-[#ecf8f1] px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-[#2ca974]" />
              <span className="text-[14px] font-semibold text-[#1f7a55]">{correctCount} correct</span>
            </div>
            <div className="flex items-center gap-3 rounded-[6px] bg-[#fdf0f2] px-4 py-3">
              <XCircle className="h-5 w-5 text-[#d95670]" />
              <span className="text-[14px] font-semibold text-[#a33046]">{incorrectCount} incorrect</span>
            </div>
            <div className="flex items-center gap-3 rounded-[6px] bg-[var(--paper-soft)] px-4 py-3">
              <MinusCircle className="h-5 w-5 text-[var(--ink-faint)]" />
              <span className="text-[14px] font-semibold text-[#6d6759]">
                {unanswered} unanswered <span className="ml-1 font-normal text-[var(--ink-faint)]">(no answer entered)</span>
              </span>
            </div>
          </div>
        </div>

        {bySkill.length > 1 && (
          <div className="mt-6">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Accuracy by category</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySkill} margin={{ left: -22, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
                  <XAxis dataKey="skill" tick={{ fontSize: 10.5, fill: "var(--ink-faint)" }} interval={0} angle={-18} textAnchor="end" height={56} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--ink-faint)" }} />
                  <Tooltip contentStyle={{ background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 13 }} formatter={(v) => [`${v}%`, "Accuracy"]} />
                  <Bar dataKey="pct" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {extra}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button className="btn btn-soft" onClick={() => setReview((r) => !r)}>
            {review ? "Hide review" : "Review answers"}
          </button>
          {missed.length > 0 && onRetryMissed && (
            <button className="btn btn-primary" onClick={onRetryMissed}>
              <RotateCcw className="h-4 w-4" /> Retry {missed.length} missed
            </button>
          )}
          <button className="btn btn-ghost" onClick={onNewQuiz}>
            <LayoutDashboard className="h-4 w-4" /> New quiz
          </button>
        </div>
      </GlassCard>

      {review && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-[var(--ink)]">Review ({pool.length} questions) · Graphs clickable to enlarge</h3>
            <div className="flex gap-2">
              <button type="button" className="btn btn-soft !min-h-8 !px-3 !text-[12px]" onClick={() => setExpanded(new Set(pool.map((q) => q.id)))}>
                <Eye className="h-3.5 w-3.5" /> Expand all
              </button>
              <button type="button" className="btn btn-ghost !min-h-8 !px-3 !text-[12px]" onClick={() => setExpanded(new Set())}>
                <ChevronUp className="h-3.5 w-3.5" /> Collapse all
              </button>
            </div>
          </div>

          {pool.map((q, i) => {
            const a = answers[q.id];
            const g = graded[q.id];
            const isExpanded = expanded.has(q.id);
            const preview = stripHtml(q.questionHtml || q.questionText).slice(0, 110);

            return (
              <GlassCard key={q.id} hover={false} className="overflow-hidden p-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-soft)] bg-[var(--paper-soft)] px-4 py-3">
                  <span className="font-mono text-[12px] font-bold text-[var(--ink-faint)]">Q{i + 1}</span>
                  <span className={cn("badge", domainColor(q.domain))}>{q.domain}</span>
                  <span className={cn("badge", skillColor(q.skill))}>{q.skill}</span>
                  <span className={cn("badge border", difficultyColor(q.difficulty))}>{q.difficulty}</span>
                  <span
                    className={cn(
                      "badge ml-auto",
                      !a ? "bg-[var(--paper-soft)] text-[var(--ink-faint)]" : g?.correct ? "bg-[#ecf8f1] text-[#238a5e] border-[#bde5cf]" : "bg-[#fdf0f2] text-[#a33046] border-[#f3ccd4]",
                    )}
                  >
                    {!a ? "Unanswered" : g?.correct ? `Correct: ${g.answer}` : `You: ${g?.answer ?? a} · Correct: ${q.correctAnswer}`}
                  </span>
                  {!isExpanded && preview && (
                    <span className="hidden w-full truncate text-[12px] text-[var(--ink-faint)] sm:block sm:w-auto sm:max-w-[240px]">· {preview}…</span>
                  )}
                  <button
                    type="button"
                    className="btn btn-soft !min-h-8 !px-3 !py-1.5 !text-[12px] ml-auto sm:ml-2"
                    onClick={() => toggle(q.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" /> Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" /> Expand
                      </>
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-5 sm:p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">Full question view – passage, formula, choices, your answer & explanation</span>
                      <button type="button" className="btn btn-ghost !min-h-8 !px-2.5" onClick={() => toggle(q.id)}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div
                      className="review-graphs"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const img = target.closest("img");
                        if (img) {
                          const src = (img as HTMLImageElement).src || img.getAttribute("src");
                          if (src) {
                            e.preventDefault();
                            setLightbox({ type: "img", src });
                            return;
                          }
                        }
                        const svg = target.closest("svg");
                        if (svg) {
                          e.preventDefault();
                          setLightbox({ type: "svg", html: svg.outerHTML });
                        }
                      }}
                    >
                      <QuestionView question={q} selected={a} onSelect={() => {}} graded lockSelection showExplanation />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button type="button" className="btn btn-soft !min-h-8" onClick={() => toggle(q.id)}>
                        <ChevronUp className="h-4 w-4" /> Close
                      </button>
                    </div>

                    <style jsx>{`
                      .review-graphs :global(.sat-content img) {
                        max-height: none !important;
                        min-height: 0 !important;
                        max-width: 100% !important;
                        cursor: zoom-in;
                      }
                      .review-graphs :global(.sat-content img:not(.math-img)) {
                        border: 1px solid var(--line-soft);
                        background: #f7f6f2;
                        padding: 8px;
                        border-radius: 6px;
                      }
                      .review-graphs :global(.sat-content svg) {
                        max-width: 100%;
                        height: auto;
                        cursor: zoom-in;
                      }
                    `}</style>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      <ImageLightbox content={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
