"use client";

import { useState } from "react";
import { SATQuestion, QuestionAttempt } from "@/lib/types";
import { useBank } from "@/lib/store";

interface QuestionHistoryModalProps {
  question: SATQuestion;
  isOpen: boolean;
  onClose: () => void;
}

export function QuestionHistoryModal({
  question,
  isOpen,
  onClose,
}: QuestionHistoryModalProps) {
  const { attempts } = useBank();

  if (!isOpen) return null;

  const questionAttempts = attempts.filter((a) => a.questionId === question.id);
  const correctAttempts = questionAttempts.filter((a) => a.isCorrect).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Question History</h2>
          <p className="mt-1 text-sm text-gray-400">Question ID: {question.id}</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {question.timesAnswered}
            </div>
            <div className="text-xs text-gray-400">Answered</div>
          </div>
          <div className="rounded-lg bg-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {correctAttempts}
            </div>
            <div className="text-xs text-gray-400">Correct</div>
          </div>
          <div className="rounded-lg bg-gray-800 p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {question.mastery}%
            </div>
            <div className="text-xs text-gray-400">Mastery</div>
          </div>
        </div>

        {/* Attempt History */}
        <div className="mb-6">
          <h3 className="mb-3 font-semibold text-white">Attempt History</h3>
          {questionAttempts.length === 0 ? (
            <p className="text-sm text-gray-400">No attempts yet</p>
          ) : (
            <div className="flex gap-2">
              {questionAttempts.map((attempt, idx) => (
                <div
                  key={attempt.id}
                  className={`flex h-8 w-8 items-center justify-center rounded text-sm font-bold ${
                    attempt.isCorrect
                      ? "bg-green-900 text-green-200"
                      : "bg-red-900 text-red-200"
                  }`}
                  title={`Attempt ${idx + 1}: ${
                    attempt.isCorrect ? "Correct" : "Incorrect"
                  } - ${new Date(attempt.createdAt).toLocaleDateString()}`}
                >
                  {attempt.isCorrect ? "✓" : "✗"}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last Reviewed */}
        {question.lastReviewed && (
          <div className="mb-6 rounded-lg bg-gray-800 p-3">
            <p className="text-xs text-gray-400">Last Reviewed</p>
            <p className="text-sm text-white">
              {new Date(question.lastReviewed).toLocaleDateString()} at{" "}
              {new Date(question.lastReviewed).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </>
  );
}
