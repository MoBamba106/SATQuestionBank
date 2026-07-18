"use client";

import * as React from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Trophy, RotateCcw, LayoutDashboard, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { SafeHtml } from "@/components/ui/safe-html";
import { cn, difficultyColor, stripHtml } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

export type GradedMap = Record<string, { correct: boolean; answer: string }>;

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

  const answered = pool.filter((q) => answers[q.id] && String(answers[q.id]).trim() !== "");
  const correctCount = pool.filter((q) => graded[q.id]?.correct).length;
  const incorrectCount = answered.length - correctCount;
  const unanswered = pool.length - answered.length;
  const pct = pool.length ? Math.round((correctCount / pool.length) * 100) : 0;
  const missed = pool.filter((q) => answers[q.id] && !graded[q.id]?.correct);

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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#ffe9a8] to-[#f2b73c] shadow-[0_8px_24px_rgba(242,183,60,0.4)]">
            <Trophy className="h-8 w-8 text-[#8a6100]" />
          </div>
          <h2 className="font-display mt-4 text-3xl font-bold text-[#2b2b2a]">
            {pct >= 80 ? "Congratulations!" : pct >= 60 ? "Nice work!" : "Quiz complete"}
          </h2>
          <p className="mt-1 text-[15px] text-[#8a8680]">{label}</p>
          <p className="mt-3 text-[17px] font-semibold text-[#2b2b2a]">
            You scored <span className="hl-yellow px-1 text-[#1f1e1c]">{correctCount} / {pool.length}</span>
            {" "}({pct}%)
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="relative mx-auto h-[220px] w-full max-w-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#fffdf8", border: "1px solid #e2dbc9", borderRadius: 12, fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold text-[#2b2b2a]">{pct}%</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8680]">score</span>
            </div>
          </div>

          <div className="space-y-3 self-center">
            <div className="flex items-center gap-3 rounded-xl bg-[#ecf8f1] px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-[#2ca974]" />
              <span className="text-[14px] font-semibold text-[#1f7a55]">{correctCount} correct</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#fdf0f2] px-4 py-3">
              <XCircle className="h-5 w-5 text-[#d95670]" />
              <span className="text-[14px] font-semibold text-[#a33046]">{incorrectCount} incorrect</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#f6f2e8] px-4 py-3">
              <MinusCircle className="h-5 w-5 text-[#a8a294]" />
              <span className="text-[14px] font-semibold text-[#6d6759]">
                {unanswered} unanswered
                <span className="ml-1 font-normal text-[#8a8680]">(no answer entered)</span>
              </span>
            </div>
          </div>
        </div>

        {bySkill.length > 1 && (
          <div className="mt-6">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">Accuracy by category</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySkill} margin={{ left: -22, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ece5d4" vertical={false} />
                  <XAxis dataKey="skill" tick={{ fontSize: 10.5, fill: "#8a8680" }} interval={0} angle={-18} textAnchor="end" height={56} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#8a8680" }} />
                  <Tooltip
                    contentStyle={{ background: "#fffdf8", border: "1px solid #e2dbc9", borderRadius: 12, fontSize: 13 }}
                    formatter={(v) => [`${v}%`, "Accuracy"]}
                  />
                  <Bar dataKey="pct" fill="#5b8def" radius={[6, 6, 0, 0]} maxBarSize={42} />
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
        <div className="space-y-4">
          {pool.map((q, i) => {
            const a = answers[q.id];
            const g = graded[q.id];
            return (
              <GlassCard key={q.id} hover={false} className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] font-bold text-[#8a8680]">Q{i + 1}</span>
                  <span className="badge badge-blue">{q.domain}</span>
                  <span className="badge">{q.skill}</span>
                  <span className={cn("badge border", difficultyColor(q.difficulty))}>{q.difficulty}</span>
                  <span className={cn(
                    "badge ml-auto",
                    !a ? "bg-[#f6f2e8] text-[#8a8680]" : g?.correct ? "bg-[#ecf8f1] text-[#238a5e] border-[#bde5cf]" : "bg-[#fdf0f2] text-[#a33046] border-[#f3ccd4]",
                  )}>
                    {!a ? "Unanswered" : g?.correct ? `Correct — ${g.answer}` : `You answered ${g?.answer ?? a} · Correct: ${q.correctAnswer}`}
                  </span>
                </div>
                <p className="mb-3 text-[13.5px] text-[#55524a]">{stripHtml(q.questionHtml || q.questionText).slice(0, 200)}</p>
                {q.explanation && (
                  <details className="rounded-xl bg-[#f8f5ec] px-4 py-3">
                    <summary className="cursor-pointer text-[12.5px] font-bold text-[#3a5fc8]">Show explanation</summary>
                    <SafeHtml html={q.explanation} className="sat-content mt-2 text-[13.5px]" />
                  </details>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
