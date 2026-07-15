"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBank } from "@/lib/store";
import Link from "next/link";

export default function StudySessionsPage() {
  const router = useRouter();
  const { questions, studySessions, getMistakes, setCustomQuizPool } = useBank();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  const startSession = (sessionId: string) => {
    const session = studySessions.find((s) => s.id === sessionId);
    if (!session) return;

    let questionIds: string[] = [];

    if (sessionId === "quick-10") {
      questionIds = questions
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
        .map((q) => q.id);
    } else if (sessionId === "math-warmup") {
      questionIds = questions
        .filter((q) => q.domain === "Math")
        .sort(() => Math.random() - 0.5)
        .slice(0, 15)
        .map((q) => q.id);
    } else if (sessionId === "hard-practice") {
      questionIds = questions
        .filter((q) => q.difficulty === "Hard" || q.difficulty === "Very Hard")
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map((q) => q.id);
    } else if (sessionId === "review-mistakes") {
      questionIds = getMistakes().map((q) => q.id);
    } else if (sessionId === "mixed-review") {
      questionIds = questions
        .sort(() => Math.random() - 0.5)
        .slice(0, 25)
        .map((q) => q.id);
    } else if (sessionId === "reading-sprint") {
      questionIds = questions
        .filter((q) => q.domain === "Reading & Writing")
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map((q) => q.id);
    } else {
      const customSession = studySessions.find((s) => s.id === sessionId);
      if (customSession) {
        questionIds = customSession.questionIds;
      }
    }

    setCustomQuizPool(questionIds);
    router.push("/quiz");
  };

  const handleCreateSession = () => {
    if (!newSessionName.trim()) return;
    // TODO: Implement custom session creation
    setNewSessionName("");
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">
            ← Back
          </Link>
          <h1 className="text-4xl font-bold text-white">Study Sessions</h1>
          <p className="mt-2 text-gray-400">
            Choose a preset session or create your own personalized study plan
          </p>
        </div>

        {/* Preset Sessions */}
        <div className="mb-12">
          <h2 className="mb-4 text-2xl font-bold text-white">Preset Sessions</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studySessions.map((session) => (
              <button
                key={session.id}
                onClick={() => startSession(session.id)}
                className="group rounded-lg border border-gray-700 bg-gray-800/50 p-6 transition-all hover:border-blue-500 hover:bg-gray-800"
              >
                <div className="mb-3 text-3xl">
                  {session.id === "quick-10" && "⚡"}
                  {session.id === "math-warmup" && "🔢"}
                  {session.id === "hard-practice" && "💪"}
                  {session.id === "review-mistakes" && "❌"}
                  {session.id === "mixed-review" && "🎯"}
                  {session.id === "reading-sprint" && "📖"}
                </div>
                <h3 className="text-lg font-semibold text-white group-hover:text-blue-400">
                  {session.name}
                </h3>
                <p className="mt-2 text-sm text-gray-400">{session.description}</p>
                {session.duration && (
                  <p className="mt-3 text-xs text-gray-500">
                    ⏱️ ~{session.duration} minutes
                  </p>
                )}
                <div className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors group-hover:bg-blue-700">
                  Start
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Create Custom Session */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">Create Custom Session</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            + New Session
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-white">Create Custom Session</h3>
            <input
              type="text"
              placeholder="Session name"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreateSession}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2 font-medium text-gray-300 transition-colors hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
