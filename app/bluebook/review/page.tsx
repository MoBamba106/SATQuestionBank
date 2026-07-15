"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBank } from "@/lib/store";
import Link from "next/link";

interface TestResult {
  testId: string;
  testNumber: string;
  totalScore: number;
  rwScore: number;
  mathScore: number;
  correctCount: number;
  incorrectCount: number;
  timeSpent: number; // in minutes
  completedAt: string;
}

export default function BluebookReviewPage() {
  const router = useRouter();
  const { attempts, questions } = useBank();
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [selectedTab, setSelectedTab] = useState<"overview" | "breakdown" | "questions">(
    "overview"
  );

  useEffect(() => {
    // Get the test result from session storage or state
    const testData = sessionStorage.getItem("lastTestResult");
    if (testData) {
      setTestResult(JSON.parse(testData));
    }
  }, []);

  if (!testResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/bluebook" className="mb-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">
            ← Back to Tests
          </Link>
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
            <p className="text-gray-400">No test results found</p>
          </div>
        </div>
      </div>
    );
  }

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  const mathAttempts = attempts.filter((a) => {
    const q = questions.find((q) => q.id === a.questionId);
    return q?.domain === "Math";
  });
  const mathCorrect = mathAttempts.filter((a) => a.isCorrect).length;
  const mathAccuracy = mathAttempts.length > 0 ? Math.round((mathCorrect / mathAttempts.length) * 100) : 0;

  const rwAttempts = attempts.filter((a) => {
    const q = questions.find((q) => q.id === a.questionId);
    return q?.domain === "Reading & Writing";
  });
  const rwCorrect = rwAttempts.filter((a) => a.isCorrect).length;
  const rwAccuracy = rwAttempts.length > 0 ? Math.round((rwCorrect / rwAttempts.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/bluebook" className="mb-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">
            ← Back to Tests
          </Link>
          <h1 className="text-4xl font-bold text-white">{testResult.testNumber} Results</h1>
          <p className="mt-2 text-gray-400">
            Completed on {new Date(testResult.completedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Score Display */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border-2 border-yellow-600 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 p-8 text-center">
            <div className="text-5xl font-bold text-yellow-400">{testResult.totalScore}</div>
            <div className="mt-2 text-sm text-yellow-200">Total Score</div>
            <div className="mt-2 text-xs text-yellow-300">/1600</div>
          </div>

          <div className="rounded-lg border border-blue-600 bg-blue-900/20 p-8 text-center">
            <div className="text-4xl font-bold text-blue-400">{testResult.rwScore}</div>
            <div className="mt-2 text-sm text-blue-200">Reading & Writing</div>
            <div className="mt-2 text-xs text-blue-300">/800</div>
          </div>

          <div className="rounded-lg border border-green-600 bg-green-900/20 p-8 text-center">
            <div className="text-4xl font-bold text-green-400">{testResult.mathScore}</div>
            <div className="mt-2 text-sm text-green-200">Math</div>
            <div className="mt-2 text-xs text-green-300">/800</div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="text-2xl font-bold text-green-400">{testResult.correctCount}</div>
            <div className="text-xs text-gray-400">Correct</div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="text-2xl font-bold text-red-400">{testResult.incorrectCount}</div>
            <div className="text-xs text-gray-400">Incorrect</div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="text-2xl font-bold text-purple-400">{accuracy}%</div>
            <div className="text-xs text-gray-400">Accuracy</div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="text-2xl font-bold text-orange-400">{testResult.timeSpent}m</div>
            <div className="text-xs text-gray-400">Time Spent</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-4 border-b border-gray-700">
          <button
            onClick={() => setSelectedTab("overview")}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === "overview"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedTab("breakdown")}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === "breakdown"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Breakdown
          </button>
          <button
            onClick={() => setSelectedTab("questions")}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === "questions"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Questions
          </button>
        </div>

        {/* Tab Content */}
        {selectedTab === "overview" && (
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Performance Summary</h2>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-400">Overall Accuracy</span>
                  <span className="font-medium text-white">{accuracy}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-400">Math Accuracy</span>
                  <span className="font-medium text-white">{mathAccuracy}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{ width: `${mathAccuracy}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-400">Reading & Writing Accuracy</span>
                  <span className="font-medium text-white">{rwAccuracy}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-purple-600"
                    style={{ width: `${rwAccuracy}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "breakdown" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
              <h3 className="mb-4 text-lg font-bold text-white">By Domain</h3>
              <div className="space-y-4">
                <div className="rounded bg-gray-900 p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Math</span>
                    <span className="font-bold text-green-400">
                      {mathCorrect}/{mathAttempts.length}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-green-600"
                      style={{ width: `${mathAccuracy}%` }}
                    />
                  </div>
                </div>

                <div className="rounded bg-gray-900 p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Reading & Writing</span>
                    <span className="font-bold text-purple-400">
                      {rwCorrect}/{rwAttempts.length}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-purple-600"
                      style={{ width: `${rwAccuracy}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
              <h3 className="mb-4 text-lg font-bold text-white">By Difficulty</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>Difficulty breakdown coming soon</p>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "questions" && (
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">
              Questions ({attempts.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {attempts.map((attempt, idx) => {
                const question = questions.find((q) => q.id === attempt.questionId);
                return (
                  <div
                    key={attempt.id}
                    className={`rounded-lg border p-4 ${
                      attempt.isCorrect
                        ? "border-green-700 bg-green-900/20"
                        : "border-red-700 bg-red-900/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-400">
                            Q{idx + 1}
                          </span>
                          {attempt.isCorrect ? (
                            <span className="text-green-400">✓ Correct</span>
                          ) : (
                            <span className="text-red-400">✗ Incorrect</span>
                          )}
                        </div>
                        {question && (
                          <>
                            <p className="mt-2 text-sm text-gray-300">
                              {question.questionText.substring(0, 80)}...
                            </p>
                            <div className="mt-2 flex gap-2">
                              <span className="inline-block rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
                                {question.domain}
                              </span>
                              <span className="inline-block rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
                                {question.difficulty}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push("/bluebook")}
            className="rounded-lg border border-gray-700 px-6 py-2 font-medium text-gray-300 transition-colors hover:bg-gray-800"
          >
            Take Another Test
          </button>
          <button
            onClick={() => router.push("/analytics")}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
