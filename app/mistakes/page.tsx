"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBank } from "@/lib/store";
import Link from "next/link";

export default function MistakeBankPage() {
  const router = useRouter();
  const { getMistakes, setCustomQuizPool } = useBank();
  const [filterDomain, setFilterDomain] = useState<string | null>(null);
  const [filterDaysBack, setFilterDaysBack] = useState<number | null>(null);
  const [filterNeverCorrected, setFilterNeverCorrected] = useState(false);

  const mistakes = getMistakes({
    domain: filterDomain as any,
    daysBack: filterDaysBack || undefined,
    neverCorrected: filterNeverCorrected,
  });

  const handleStartPractice = () => {
    if (mistakes.length > 0) {
      setCustomQuizPool(mistakes.map((q) => q.id));
      router.push("/quiz");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">
            ← Back
          </Link>
          <h1 className="text-4xl font-bold text-white">Mistake Bank</h1>
          <p className="mt-2 text-gray-400">
            Review and practice questions you got wrong
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Filters</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Domain Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300">Domain</label>
              <select
                value={filterDomain || ""}
                onChange={(e) => setFilterDomain(e.target.value || null)}
                className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Domains</option>
                <option value="Math">Math</option>
                <option value="Reading & Writing">Reading & Writing</option>
              </select>
            </div>

            {/* Days Back Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300">Time Period</label>
              <select
                value={filterDaysBack || ""}
                onChange={(e) => setFilterDaysBack(e.target.value ? parseInt(e.target.value) : null)}
                className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>

            {/* Never Corrected Filter */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <input
                  type="checkbox"
                  checked={filterNeverCorrected}
                  onChange={(e) => setFilterNeverCorrected(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-900"
                />
                Never Corrected
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="text-3xl font-bold text-red-400">{mistakes.length}</div>
            <div className="mt-2 text-sm text-gray-400">Questions</div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="text-3xl font-bold text-orange-400">
              {Math.round(
                mistakes.reduce((sum, q) => sum + q.mastery, 0) / (mistakes.length || 1)
              )}%
            </div>
            <div className="mt-2 text-sm text-gray-400">Avg Mastery</div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="text-3xl font-bold text-blue-400">
              {mistakes.filter((q) => q.timesCorrect === 0).length}
            </div>
            <div className="mt-2 text-sm text-gray-400">Never Corrected</div>
          </div>
        </div>

        {/* Action Button */}
        {mistakes.length > 0 && (
          <div className="mb-8">
            <button
              onClick={handleStartPractice}
              className="rounded-lg bg-blue-600 px-8 py-3 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Practice {mistakes.length} Mistakes
            </button>
          </div>
        )}

        {/* Questions List */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            {mistakes.length === 0 ? "No mistakes found" : `Showing ${mistakes.length} mistakes`}
          </h2>

          {mistakes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-gray-400">Great job! No mistakes matching these filters.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mistakes.map((question) => (
                <div
                  key={question.id}
                  className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">{question.questionText.substring(0, 100)}...</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-block rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
                          {question.domain}
                        </span>
                        <span className="inline-block rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
                          {question.skill}
                        </span>
                        <span className="inline-block rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-orange-400">
                        {question.mastery}%
                      </div>
                      <div className="text-xs text-gray-400">mastery</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
