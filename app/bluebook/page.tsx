"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBank } from "@/lib/store";
import Link from "next/link";

interface OfficialTest {
  id: string;
  testNumber: string;
  releaseDate: string;
  totalQuestions: number;
  rwQuestions: number;
  mathQuestions: number;
  estimatedTime: number; // in minutes
  description: string;
}

// Mock official SAT practice tests
const OFFICIAL_TESTS: OfficialTest[] = [
  {
    id: "test-1",
    testNumber: "Practice Test 1",
    releaseDate: "2024-01-15",
    totalQuestions: 154,
    rwQuestions: 52,
    mathQuestions: 58,
    estimatedTime: 180,
    description: "Official SAT Practice Test 1 - Full Length",
  },
  {
    id: "test-2",
    testNumber: "Practice Test 2",
    releaseDate: "2024-02-20",
    totalQuestions: 154,
    rwQuestions: 52,
    mathQuestions: 58,
    estimatedTime: 180,
    description: "Official SAT Practice Test 2 - Full Length",
  },
  {
    id: "test-3",
    testNumber: "Practice Test 3",
    releaseDate: "2024-03-10",
    totalQuestions: 154,
    rwQuestions: 52,
    mathQuestions: 58,
    estimatedTime: 180,
    description: "Official SAT Practice Test 3 - Full Length",
  },
  {
    id: "test-4",
    testNumber: "Practice Test 4",
    releaseDate: "2024-04-05",
    totalQuestions: 154,
    rwQuestions: 52,
    mathQuestions: 58,
    estimatedTime: 180,
    description: "Official SAT Practice Test 4 - Full Length",
  },
];

export default function BluebookPage() {
  const router = useRouter();
  const { questions } = useBank();
  const [selectedTest, setSelectedTest] = useState<OfficialTest | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  const handleStartTest = (test: OfficialTest) => {
    setSelectedTest(test);
    setShowTestModal(true);
  };

  const handleBeginTest = () => {
    if (selectedTest) {
      // Store test metadata in session/state
      sessionStorage.setItem(
        "currentTest",
        JSON.stringify({
          testId: selectedTest.id,
          testNumber: selectedTest.testNumber,
          startTime: new Date().toISOString(),
          mode: "bluebook",
        })
      );

      // For now, use a subset of questions as the test
      // In production, this would load the actual test questions
      const testQuestions = questions.slice(0, 30); // Simplified for demo
      useBank.setState({ customQuizPool: testQuestions.map((q) => q.id) });

      router.push("/quiz?mode=bluebook");
      setShowTestModal(false);
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
          <h1 className="text-4xl font-bold text-white">Official SAT Practice Tests</h1>
          <p className="mt-2 text-gray-400">
            Take full-length official SAT practice tests in Bluebook mode
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-8 rounded-lg border border-blue-600 bg-blue-900/20 p-6">
          <h2 className="font-semibold text-blue-200">📖 Bluebook Mode</h2>
          <p className="mt-2 text-sm text-blue-100">
            In Bluebook mode, you'll experience the official SAT format:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-blue-100">
            <li>✓ No explanations during the test</li>
            <li>✓ No answer checking until completion</li>
            <li>✓ Official timing (3 hours)</li>
            <li>✓ Full review after completion with detailed analytics</li>
          </ul>
        </div>

        {/* Tests Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {OFFICIAL_TESTS.map((test) => (
            <div
              key={test.id}
              className="group rounded-lg border border-gray-700 bg-gray-800/50 p-6 transition-all hover:border-blue-500 hover:bg-gray-800"
            >
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-white">{test.testNumber}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Released: {new Date(test.releaseDate).toLocaleDateString()}
                </p>
              </div>

              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded bg-gray-900 p-3 text-center">
                  <div className="text-lg font-bold text-blue-400">{test.totalQuestions}</div>
                  <div className="text-xs text-gray-400">Total Questions</div>
                </div>
                <div className="rounded bg-gray-900 p-3 text-center">
                  <div className="text-lg font-bold text-purple-400">{test.rwQuestions}</div>
                  <div className="text-xs text-gray-400">Reading & Writing</div>
                </div>
                <div className="rounded bg-gray-900 p-3 text-center">
                  <div className="text-lg font-bold text-green-400">{test.mathQuestions}</div>
                  <div className="text-xs text-gray-400">Math</div>
                </div>
              </div>

              <p className="mb-4 text-sm text-gray-300">{test.description}</p>

              <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                <span>⏱️ {test.estimatedTime} minutes</span>
              </div>

              <button
                onClick={() => handleStartTest(test)}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Start Test
              </button>
            </div>
          ))}
        </div>

        {/* Test Modal */}
        {showTestModal && selectedTest && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowTestModal(false)}
            />
            <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl">
              <h3 className="mb-4 text-xl font-bold text-white">
                Start {selectedTest.testNumber}?
              </h3>

              <div className="mb-6 space-y-3 rounded-lg bg-gray-800 p-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="font-medium text-white">
                    {selectedTest.estimatedTime} minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Questions:</span>
                  <span className="font-medium text-white">
                    {selectedTest.totalQuestions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className="font-medium text-blue-400">Bluebook (No Hints)</span>
                </div>
              </div>

              <div className="mb-6 rounded-lg border border-yellow-600 bg-yellow-900/20 p-3">
                <p className="text-sm text-yellow-200">
                  ⚠️ Make sure you have {selectedTest.estimatedTime} minutes available and
                  won't be interrupted.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBeginTest}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Begin Test
                </button>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="flex-1 rounded-lg border border-gray-700 px-4 py-2 font-medium text-gray-300 transition-colors hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
