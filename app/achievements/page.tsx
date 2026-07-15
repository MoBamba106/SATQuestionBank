"use client";

import { useBank } from "@/lib/store";
import Link from "next/link";

const ALL_ACHIEVEMENTS = [
  {
    id: "century",
    title: "Century",
    description: "Solve 100 questions",
    icon: "🎯",
    condition: "100 questions answered",
  },
  {
    id: "organizer",
    title: "Organizer",
    description: "Create first collection",
    icon: "📁",
    condition: "Create 1 collection",
  },
  {
    id: "math-master",
    title: "Math Master",
    description: "Perfect Math quiz",
    icon: "🔢",
    condition: "100% mastery on Math",
  },
  {
    id: "reading-pro",
    title: "Reading Pro",
    description: "Perfect Reading quiz",
    icon: "📖",
    condition: "100% mastery on Reading",
  },
  {
    id: "on-fire",
    title: "On Fire",
    description: "5 day study streak",
    icon: "🔥",
    condition: "5 consecutive days",
  },
  {
    id: "dedicated",
    title: "Dedicated",
    description: "30 day longest streak",
    icon: "💪",
    condition: "30 day streak",
  },
  {
    id: "first-test",
    title: "Test Taker",
    description: "Complete first practice test",
    icon: "📝",
    condition: "Take 1 practice test",
  },
  {
    id: "perfect-score",
    title: "Perfect Score",
    description: "Score 1600 on practice test",
    icon: "⭐",
    condition: "1600 on practice test",
  },
];

export default function AchievementsPage() {
  const { achievements, questions } = useBank();

  const unlockedIds = new Set(achievements.map((a) => a.title.toLowerCase().replace(/\s+/g, "-")));

  const totalQuestionsAnswered = questions.reduce((sum, q) => sum + q.timesAnswered, 0);
  const progress = {
    century: Math.min(totalQuestionsAnswered, 100),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">
            ← Back
          </Link>
          <h1 className="text-4xl font-bold text-white">Achievements</h1>
          <p className="mt-2 text-gray-400">
            Unlock achievements by completing challenges
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="text-3xl font-bold text-blue-400">{achievements.length}</div>
            <div className="mt-2 text-sm text-gray-400">Achievements Unlocked</div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="text-3xl font-bold text-purple-400">
              {ALL_ACHIEVEMENTS.length - achievements.length}
            </div>
            <div className="mt-2 text-sm text-gray-400">Remaining</div>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="text-3xl font-bold text-yellow-400">
              {Math.round((achievements.length / ALL_ACHIEVEMENTS.length) * 100)}%
            </div>
            <div className="mt-2 text-sm text-gray-400">Completion</div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ALL_ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = achievements.some(
              (a) => a.title.toLowerCase().replace(/\s+/g, "-") === achievement.id
            );

            return (
              <div
                key={achievement.id}
                className={`rounded-lg border p-6 transition-all ${
                  isUnlocked
                    ? "border-yellow-600 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20"
                    : "border-gray-700 bg-gray-800/50 opacity-60"
                }`}
              >
                <div className="mb-3 text-4xl">{achievement.icon}</div>
                <h3 className="font-semibold text-white">{achievement.title}</h3>
                <p className="mt-1 text-sm text-gray-400">{achievement.description}</p>
                <p className="mt-3 text-xs text-gray-500">{achievement.condition}</p>

                {isUnlocked && (
                  <div className="mt-4 inline-block rounded-full bg-yellow-600 px-3 py-1 text-xs font-bold text-yellow-100">
                    ✓ Unlocked
                  </div>
                )}

                {achievement.id === "century" && !isUnlocked && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-gray-400">
                        {progress.century}/{100}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all"
                        style={{ width: `${(progress.century / 100) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
