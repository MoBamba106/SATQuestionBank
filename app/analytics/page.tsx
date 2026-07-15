"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { useBank } from "@/lib/store";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AnalyticsPage() {
  const questions = useBank((s) => s.questions);
  const attempts = useBank((s) => s.attempts);
  const [activeTab, setActiveTab] = useState<"questions" | "tests">("questions");
  const [showManual, setShowManual] = useState(false);
  const [tests, setTests] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("sat-tests") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });

  const saveTests = (t: any[]) => {
    setTests(t);
    localStorage.setItem("sat-tests", JSON.stringify(t));
  };

  // ============ PRACTICE QUESTIONS TAB ============
  const total = questions.length;
  const answered = questions.reduce((a, q) => a + q.timesAnswered, 0);
  const correct = questions.reduce((a, q) => a + q.timesCorrect, 0);
  const mastery = total ? Math.round(questions.reduce((a, q) => a + q.mastery, 0) / total) : 0;

  const mathQuestions = questions.filter((q) => q.domain === "Math");
  const mathCorrect = mathQuestions.reduce((a, q) => a + q.timesCorrect, 0);
  const mathAnswered = mathQuestions.reduce((a, q) => a + q.timesAnswered, 0);
  const mathMastery = mathAnswered > 0 ? Math.round((mathCorrect / mathAnswered) * 100) : 0;

  const rwQuestions = questions.filter((q) => q.domain === "Reading & Writing");
  const rwCorrect = rwQuestions.reduce((a, q) => a + q.timesCorrect, 0);
  const rwAnswered = rwQuestions.reduce((a, q) => a + q.timesAnswered, 0);
  const rwMastery = rwAnswered > 0 ? Math.round((rwCorrect / rwAnswered) * 100) : 0;

  // Skill breakdown
  const skillBreakdown = questions.reduce(
    (acc, q) => {
      const key = q.skill;
      if (!acc[key]) {
        acc[key] = { skill: key, correct: 0, total: 0, mastery: 0 };
      }
      acc[key].correct += q.timesCorrect;
      acc[key].total += q.timesAnswered;
      acc[key].mastery = acc[key].total > 0 ? Math.round((acc[key].correct / acc[key].total) * 100) : 0;
      return acc;
    },
    {} as Record<string, any>
  );

  const skillData = Object.values(skillBreakdown).filter((s: any) => s.total > 0);

  // ============ PRACTICE TESTS TAB ============
  const testStats = tests.length > 0 ? {
    avgTotal: Math.round(tests.reduce((a, t) => a + parseInt(t.total), 0) / tests.length),
    avgRw: Math.round(tests.reduce((a, t) => a + parseInt(t.rw), 0) / tests.length),
    avgMath: Math.round(tests.reduce((a, t) => a + parseInt(t.math), 0) / tests.length),
    highestTotal: Math.max(...tests.map((t) => parseInt(t.total))),
    lowestTotal: Math.min(...tests.map((t) => parseInt(t.total))),
  } : null;

  const hasData = answered > 0;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
      <h1 className="text-[32px] font-display font-[680]">Analytics</h1>
      <p className="text-ink-soft mt-1">Track your progress across practice questions and official tests.</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "questions"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Practice Questions
        </button>
        <button
          onClick={() => setActiveTab("tests")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "tests"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Practice Tests
        </button>
      </div>

      {/* ============ PRACTICE QUESTIONS TAB ============ */}
      {activeTab === "questions" && (
        <>
          <div className="grid md:grid-cols-4 gap-4 mt-7">
            {[
              { k: "Bank Size", v: total },
              { k: "Answered", v: answered },
              { k: "Correct", v: correct },
              { k: "Overall Mastery", v: mastery ? mastery + "%" : "—" },
            ].map((s) => (
              <GlassCard key={s.k} className="p-5">
                <div className="text-[11px] text-ink-soft uppercase tracking-wider">{s.k}</div>
                <div className="text-[28px] font-display font-[700] mt-1 neon-text-cyan">
                  {s.v}
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="grid xl:grid-cols-3 gap-5 mt-6">
            {/* Mastery by Domain */}
            <GlassCard className="p-6 xl:col-span-2">
              <div className="text-sm font-[600] mb-4">Mastery by Domain</div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Math ({mathAnswered} answered)</span>
                    <span className="font-bold text-green-400">{mathMastery}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-700">
                    <div
                      className="h-3 rounded-full bg-green-600 transition-all"
                      style={{ width: `${mathMastery}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Reading & Writing ({rwAnswered} answered)</span>
                    <span className="font-bold text-purple-400">{rwMastery}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-700">
                    <div
                      className="h-3 rounded-full bg-purple-600 transition-all"
                      style={{ width: `${rwMastery}%` }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Quick Stats */}
            <GlassCard className="p-5">
              <div className="text-sm font-[600] mb-4">Quick Stats</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Accuracy Rate</span>
                  <span className="font-bold">
                    {answered > 0 ? Math.round((correct / answered) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg per Question</span>
                  <span className="font-bold">
                    {answered > 0 ? Math.round(answered / total) : 0}x
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Favorites</span>
                  <span className="font-bold">
                    {questions.filter((q) => q.favorite).length}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Skill Breakdown */}
          {skillData.length > 0 && (
            <GlassCard className="p-6 mt-6">
              <div className="text-sm font-[600] mb-4">Breakdown by Skill</div>
              <div className="grid md:grid-cols-2 gap-4">
                {skillData.map((skill: any) => (
                  <div key={skill.skill} className="rounded-lg bg-gray-900/50 p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{skill.skill}</span>
                      <span className="text-xs text-gray-400">
                        {skill.correct}/{skill.total}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${skill.mastery}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-400">{skill.mastery}% mastery</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      )}

      {/* ============ PRACTICE TESTS TAB ============ */}
      {activeTab === "tests" && (
        <>
          {testStats && (
            <div className="grid md:grid-cols-4 gap-4 mt-7">
              {[
                { k: "Tests Taken", v: tests.length },
                { k: "Avg Total Score", v: testStats.avgTotal },
                { k: "Avg R&W", v: testStats.avgRw },
                { k: "Avg Math", v: testStats.avgMath },
              ].map((s) => (
                <GlassCard key={s.k} className="p-5">
                  <div className="text-[11px] text-ink-soft uppercase tracking-wider">{s.k}</div>
                  <div className="text-[28px] font-display font-[700] mt-1 neon-text-cyan">
                    {s.v}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          <div className="grid xl:grid-cols-3 gap-5 mt-6">
            {/* Score Trend */}
            <GlassCard className="p-6 xl:col-span-2 min-h-[320px] flex items-center justify-center">
              {!tests.length ? (
                <div className="text-center">
                  <div className="text-lg font-[600] text-ink">No practice tests logged yet</div>
                  <div className="text-sm text-ink-soft mt-2 max-w-md">
                    Take a Bluebook practice test or manually enter your scores to see trends.
                  </div>
                  <button
                    onClick={() => setShowManual(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#3a6fe3] text-white font-[600] text-sm"
                  >
                    Log Test Score
                  </button>
                </div>
              ) : (
                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tests}>
                      <CartesianGrid stroke="rgba(60,45,20,0.08)" vertical={false} />
                      <XAxis dataKey="date" stroke="#8a8680" />
                      <YAxis stroke="#8a8680" domain={[800, 1600]} />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e5dfd2",
                          borderRadius: 12,
                          color: "#2b2b2a",
                        }}
                      />
                      <Line type="monotone" dataKey="total" stroke="#3a6fe3" strokeWidth={2.5} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>

            {/* Test Statistics */}
            {testStats && (
              <GlassCard className="p-5">
                <div className="text-sm font-[600] mb-3">Score Range</div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Highest</span>
                    <span className="font-bold text-green-400">{testStats.highestTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lowest</span>
                    <span className="font-bold text-red-400">{testStats.lowestTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Difference</span>
                    <span className="font-bold">
                      {testStats.highestTotal - testStats.lowestTotal}
                    </span>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Test Log */}
          <GlassCard className="p-6 mt-6">
            <div className="text-sm font-[600] mb-4">Test History</div>
            {tests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No tests logged yet</p>
                <button
                  onClick={() => setShowManual(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#3a6fe3] text-white font-[600] text-sm"
                >
                  Log Your First Test
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-ink-soft text-[11px] border-b border-white/10">
                      <tr>
                        <th className="text-left py-3">Test</th>
                        <th className="text-center">Total</th>
                        <th className="text-center">R&W</th>
                        <th className="text-center">Math</th>
                        <th className="text-center">Date</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tests.map((t, i) => (
                        <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition">
                          <td className="py-3">{t.name}</td>
                          <td className="text-center font-bold text-yellow-400">{t.total}</td>
                          <td className="text-center text-purple-400">{t.rw}</td>
                          <td className="text-center text-green-400">{t.math}</td>
                          <td className="text-center text-ink-soft">{t.date}</td>
                          <td className="text-center">
                            <button
                              onClick={() => {
                                const nt = tests.filter((_, idx) => idx !== i);
                                saveTests(nt);
                              }}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setShowManual(true)}
                    className="px-3 py-2 rounded-xl glass-subtle text-sm"
                  >
                    Add Test
                  </button>
                  <button
                    onClick={() => saveTests([])}
                    className="px-3 py-2 rounded-xl glass-subtle text-sm text-red-300"
                  >
                    Clear All
                  </button>
                </div>
              </>
            )}
          </GlassCard>
        </>
      )}

      {/* Manual entry modal */}
      <AnimatePresence>
        {showManual && (
          <ManualTestModal
            onClose={() => setShowManual(false)}
            onSave={(t: any) => {
              const nt = [...tests, t];
              saveTests(nt);
              setShowManual(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ManualTestModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (t: any) => void;
}) {
  const [form, setForm] = useState({
    name: "Bluebook Test",
    date: new Date().toISOString().slice(0, 10),
    total: "",
    rw: "",
    math: "",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-[22px] p-6 max-w-lg w-full"
      >
        <div className="text-lg font-[600] mb-4 text-ink">Manual Test Entry</div>
        <div className="grid grid-cols-2 gap-3 text-sm text-ink">
          <label className="col-span-2">
            Test name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 bg-white text-ink border border-paper-300 rounded-xl px-3 py-2"
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full mt-1 bg-white text-ink border border-paper-300 rounded-xl px-3 py-2"
            />
          </label>
          <label>
            Total (400-1600)
            <input
              type="number"
              value={form.total}
              onChange={(e) => setForm({ ...form, total: e.target.value })}
              className="w-full mt-1 bg-white text-ink border border-paper-300 rounded-xl px-3 py-2"
            />
          </label>
          <label>
            R&W (200-800)
            <input
              type="number"
              value={form.rw}
              onChange={(e) => setForm({ ...form, rw: e.target.value })}
              className="w-full mt-1 bg-white text-ink border border-paper-300 rounded-xl px-3 py-2"
            />
          </label>
          <label>
            Math (200-800)
            <input
              type="number"
              value={form.math}
              onChange={(e) => setForm({ ...form, math: e.target.value })}
              className="w-full mt-1 bg-white text-ink border border-paper-300 rounded-xl px-3 py-2"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl glass-subtle text-sm text-ink"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 rounded-xl bg-[#2ca974] text-white font-[600] text-sm"
          >
            Save Test
          </button>
        </div>
      </div>
    </motion.div>
  );
}
