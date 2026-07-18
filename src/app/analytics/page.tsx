"use client";

import * as React from "react";
import { Loader2, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/lib/api-client";
import type { StatsPayload } from "@/lib/types";

const TT = {
  contentStyle: { background: "#fffdf8", border: "1px solid #e2dbc9", borderRadius: 12, fontSize: 13 },
} as const;

export default function AnalyticsPage() {
  const { data: s, loading } = useApi<StatsPayload>("/api/stats", "stats");

  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[#8a8680]">
        <Loader2 className="h-5 w-5 animate-spin" /> Crunching your data…
      </div>
    );

  const noData = !s || s.totalAttempts === 0;
  const donut = [
    { name: "Correct", value: s?.totalCorrect ?? 0, fill: "#2ca974" },
    { name: "Incorrect", value: (s?.totalAttempts ?? 0) - (s?.totalCorrect ?? 0), fill: "#e56a8a" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#2b2b2a]">
          <span className="hl-blue px-1">Analytics</span>
        </h1>
        <p className="mt-1 text-[15px] text-[#8a8680]">Real numbers from your graded attempts — never fake stats.</p>
      </div>

      {noData ? (
        <GlassCard hover={false} className="p-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-10 w-10 text-[#d5cfc0]" />
          <p className="font-display text-xl font-bold text-[#55524a]">No data yet</p>
          <p className="text-[13.5px] text-[#8a8680]">Check some answers in a quiz and your analytics appear here.</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Graded checks", value: s!.totalAttempts },
              { label: "Unique questions", value: s!.uniqueQuestions },
              { label: "Correct", value: s!.totalCorrect },
              { label: "Accuracy", value: `${s!.accuracy}%` },
            ].map((c) => (
              <GlassCard key={c.label} hover={false} className="p-5 text-center">
                <div className="font-display text-3xl font-bold text-[#2b2b2a]">{c.value}</div>
                <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-[#8a8680]">{c.label}</div>
              </GlassCard>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard hover={false} className="p-6">
              <h2 className="font-display mb-3 text-lg font-bold">Accuracy by domain</h2>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s!.byDomain.map((d) => ({ ...d, pct: d.total ? Math.round((d.correct / d.total) * 100) : 0 }))} margin={{ left: -22, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece5d4" vertical={false} />
                    <XAxis dataKey="domain" tick={{ fontSize: 11, fill: "#8a8680" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#8a8680" }} />
                    <Tooltip {...TT} formatter={(v) => [`${v}%`, "Accuracy"]} />
                    <Bar dataKey="pct" fill="#5b8def" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="p-6">
              <h2 className="font-display mb-3 text-lg font-bold">Overall split</h2>
              <div className="relative mx-auto h-[220px] max-w-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={0}>
                      {donut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip {...TT} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl font-bold">{s!.accuracy}%</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8680]">accuracy</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="p-6">
              <h2 className="font-display mb-3 text-lg font-bold">Accuracy by difficulty</h2>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s!.byDifficulty.map((d) => ({ ...d, pct: d.total ? Math.round((d.correct / d.total) * 100) : 0 }))} margin={{ left: -22, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece5d4" vertical={false} />
                    <XAxis dataKey="difficulty" tick={{ fontSize: 11, fill: "#8a8680" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#8a8680" }} />
                    <Tooltip {...TT} formatter={(v) => [`${v}%`, "Accuracy"]} />
                    <Bar dataKey="pct" fill="#d9922e" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="p-6">
              <h2 className="font-display mb-3 text-lg font-bold">Attempts over time</h2>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s!.activity} margin={{ left: -22, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece5d4" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a8680" }} tickFormatter={(d: string) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: "#8a8680" }} allowDecimals={false} />
                    <Tooltip {...TT} />
                    <Area type="monotone" dataKey="attempts" stroke="#5b8def" fill="#5b8def22" strokeWidth={2.5} name="Checked" />
                    <Area type="monotone" dataKey="correct" stroke="#2ca974" fill="#2ca97422" strokeWidth={2.5} name="Correct" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          <GlassCard hover={false} className="p-6">
            <h2 className="font-display mb-3 text-lg font-bold">Category breakdown</h2>
            <div className="space-y-2.5">
              {s!.bySkill.map((k) => {
                const pct = k.total ? Math.round((k.correct / k.total) * 100) : 0;
                return (
                  <div key={k.skill} className="flex items-center gap-3">
                    <span className="w-52 shrink-0 truncate text-[13px] font-semibold text-[#55524a]">{k.skill}</span>
                    <div className="h-3 grow overflow-hidden rounded-full bg-[#efe9db]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7aa5f2] to-[#3a5fc8]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-[12px] font-bold text-[#55524a]">
                      {pct}% · {k.correct}/{k.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
