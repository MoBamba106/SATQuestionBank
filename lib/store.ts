"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SATQuestion, StudyCollection, Streak, Achievement, StudySession } from "./types";
import { SEED_QUESTIONS } from "./mock-data";

type Attempt = {
  id: string;
  questionId: string;
  isCorrect: boolean;
  answer?: string;
  checkedAnswer?: string;
  mode?: "practice" | "exam" | "bluebook";
  createdAt: string;
};

type BankState = {
  questions: SATQuestion[];
  attempts: Attempt[];
  setQuestions: (q: SATQuestion[]) => void;
  upsert: (q: SATQuestion) => void;
  remove: (id: string) => void;
  clearSynthetic: () => void;
  syncFromServer: () => Promise<number>;
  recordAttempt: (id: string, isCorrect: boolean, meta?: Partial<Attempt>) => void;
  customQuizPool: string[] | null;
  setCustomQuizPool: (ids: string[] | null) => void;
  questionNotes: Record<string, string>;
  setQuestionNote: (id: string, note: string) => void;
  toggleFavorite: (id: string) => void;
  collections: StudyCollection[];
  addCollection: (name: string, description?: string) => string;
  removeCollection: (id: string) => void;
  addQuestionToCollection: (collectionId: string, questionId: string) => void;
  removeQuestionFromCollection: (collectionId: string, questionId: string) => void;
  getQuestionsInCollection: (collectionId: string) => SATQuestion[];
  studySessions: StudySession[];
  addStudySession: (name: string, questionIds: string[], duration?: number) => string;
  removeStudySession: (id: string) => void;
  streak: Streak;
  updateStreak: (lastStudyDate: Date) => void;
  getStreakInfo: () => { current: number; longest: number };
  achievements: Achievement[];
  unlockAchievement: (title: string, description: string, icon?: string) => void;
  checkAndUnlockAchievements: () => void;
  getMistakes: (filters?: { domain?: string; daysBack?: number; neverCorrected?: boolean }) => SATQuestion[];
};

export const useBank = create<BankState>()(
  persist(
    (set, get) => ({
      questions: SEED_QUESTIONS,
      setQuestions: (questions) => set({ questions }),
      upsert: (q) =>
        set((state) => {
          const idx = state.questions.findIndex((x) => x.id === q.id);
          if (idx >= 0) {
            const copy = [...state.questions];
            copy[idx] = q;
            return { questions: copy };
          }
          return { questions: [q, ...state.questions] };
        }),
      remove: (id) => set((s) => ({ questions: s.questions.filter((x) => x.id !== id) })),
      clearSynthetic: () =>
        set((s) => ({
          questions: s.questions.filter((q) => !q.id.startsWith("syn-") && !/^syn/.test(q.id)),
        })),
      attempts: [],
      recordAttempt: (id, isCorrect, meta = {}) =>
        set((state) => {
          const idx = state.questions.findIndex((x) => x.id === id);
          if (idx === -1) return {};

          const q = state.questions[idx];
          const newTimesAnswered = (q.timesAnswered || 0) + 1;
          const newTimesCorrect = (q.timesCorrect || 0) + (isCorrect ? 1 : 0);
          const newMastery = Math.round((newTimesCorrect / newTimesAnswered) * 100);

          const newAttempt: Attempt = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            questionId: id,
            isCorrect,
            createdAt: new Date().toISOString(),
            ...meta,
          };

          const copy = [...state.questions];
          copy[idx] = {
            ...q,
            timesAnswered: newTimesAnswered,
            timesCorrect: newTimesCorrect,
            mastery: newMastery,
            lastReviewed: new Date().toISOString(),
          };

          setTimeout(() => get().updateStreak(new Date()), 50);
          setTimeout(() => get().checkAndUnlockAchievements(), 100);

          return {
            questions: copy,
            attempts: [...state.attempts, newAttempt],
          };
        }),
      customQuizPool: null,
      setCustomQuizPool: (ids) => set({ customQuizPool: ids }),
      questionNotes: {},
      setQuestionNote: (id, note) =>
        set((state) => ({
          questionNotes: { ...state.questionNotes, [id]: note },
        })),
      toggleFavorite: (id) =>
        set((state) => {
          const idx = state.questions.findIndex((x) => x.id === id);
          if (idx === -1) return {};
          const copy = [...state.questions];
          copy[idx] = { ...copy[idx], favorite: !copy[idx].favorite };
          return { questions: copy };
        }),
      collections: [],
      addCollection: (name, description) => {
        const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          collections: [
            ...state.collections,
            {
              id,
              name,
              description,
              questionIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },
      removeCollection: (id) =>
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
        })),
      addQuestionToCollection: (collectionId, questionId) =>
        set((state) => {
          const idx = state.collections.findIndex((c) => c.id === collectionId);
          if (idx === -1) return {};
          const copy = [...state.collections];
          if (!copy[idx].questionIds.includes(questionId)) {
            copy[idx] = {
              ...copy[idx],
              questionIds: [...copy[idx].questionIds, questionId],
              updatedAt: new Date().toISOString(),
            };
          }
          return { collections: copy };
        }),
      removeQuestionFromCollection: (collectionId, questionId) =>
        set((state) => {
          const idx = state.collections.findIndex((c) => c.id === collectionId);
          if (idx === -1) return {};
          const copy = [...state.collections];
          copy[idx] = {
            ...copy[idx],
            questionIds: copy[idx].questionIds.filter((id) => id !== questionId),
            updatedAt: new Date().toISOString(),
          };
          return { collections: copy };
        }),
      getQuestionsInCollection: (collectionId) => {
        const state = get();
        const collection = state.collections.find((c) => c.id === collectionId);
        if (!collection) return [];
        return state.questions.filter((q) => collection.questionIds.includes(q.id));
      },
      studySessions: [
        { id: "quick-10", name: "Quick 10", description: "10 random questions", questionIds: [], duration: 10, createdAt: new Date().toISOString() },
        { id: "math-warmup", name: "Math Warmup", description: "Math questions to warm up", questionIds: [], duration: 15, createdAt: new Date().toISOString() },
        { id: "hard-practice", name: "Hard Practice", description: "Challenging questions", questionIds: [], duration: 30, createdAt: new Date().toISOString() },
        { id: "review-mistakes", name: "Review Mistakes", description: "Questions you got wrong", questionIds: [], duration: 20, createdAt: new Date().toISOString() },
        { id: "mixed-review", name: "Mixed Review", description: "All domains mixed", questionIds: [], duration: 25, createdAt: new Date().toISOString() },
        { id: "reading-sprint", name: "Reading Sprint", description: "Reading & Writing focus", questionIds: [], duration: 20, createdAt: new Date().toISOString() },
      ],
      addStudySession: (name, questionIds, duration) => {
        const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          studySessions: [...state.studySessions, { id, name, questionIds, duration, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      removeStudySession: (id) =>
        set((state) => ({
          studySessions: state.studySessions.filter((s) => s.id !== id),
        })),
      streak: {
        id: "main-streak",
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      updateStreak: (lastStudyDate) =>
        set((state) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastDate = state.streak.lastStudyDate ? new Date(state.streak.lastStudyDate) : null;
          if (lastDate) lastDate.setHours(0, 0, 0, 0);
          const todayTime = today.getTime();
          const lastTime = lastDate ? lastDate.getTime() : null;
          if (todayTime === lastTime) return {};
          let newCurrent = state.streak.currentStreak;
          if (lastTime === null || todayTime - lastTime === 24 * 60 * 60 * 1000) {
            newCurrent = (state.streak.currentStreak || 0) + 1;
          } else {
            newCurrent = 1;
          }
          const newLongest = Math.max(newCurrent, state.streak.longestStreak);
          return {
            streak: {
              ...state.streak,
              currentStreak: newCurrent,
              longestStreak: newLongest,
              lastStudyDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
        }),
      getStreakInfo: () => {
        const state = get();
        return { current: state.streak.currentStreak, longest: state.streak.longestStreak };
      },
      achievements: [],
      unlockAchievement: (title, description, icon) =>
        set((state) => {
          const exists = state.achievements.find((a) => a.title === title);
          if (exists) return {};
          return {
            achievements: [...state.achievements, { id: `ach-${Date.now()}`, title, description, icon, unlockedAt: new Date().toISOString(), createdAt: new Date().toISOString() }],
          };
        }),
      checkAndUnlockAchievements: () => {
        const state = get();
        const totalQuestionsAnswered = state.questions.reduce((sum, q) => sum + (q.timesAnswered || 0), 0);
        if (totalQuestionsAnswered >= 100) state.unlockAchievement("Century", "Solved 100 questions", "🎯");
        if (state.collections.length > 0) state.unlockAchievement("Organizer", "Created first collection", "📁");
        const mathQuestions = state.questions.filter((q) => q.domain === "Math");
        if (mathQuestions.length > 0) {
          const mathMastery = mathQuestions.reduce((sum, q) => sum + (q.mastery || 0), 0) / mathQuestions.length;
          if (mathMastery === 100) state.unlockAchievement("Math Master", "Perfect Math quiz", "🔢");
        }
        const readingQuestions = state.questions.filter((q) => q.domain === "Reading & Writing");
        if (readingQuestions.length > 0) {
          const readingMastery = readingQuestions.reduce((sum, q) => sum + (q.mastery || 0), 0) / readingQuestions.length;
          if (readingMastery === 100) state.unlockAchievement("Reading Pro", "Perfect Reading quiz", "📖");
        }
        if (state.streak.currentStreak >= 5) state.unlockAchievement("On Fire", "5 day study streak", "🔥");
        if (state.streak.longestStreak >= 30) state.unlockAchievement("Dedicated", "30 day longest streak", "💪");
      },
      getMistakes: (filters) => {
        const state = get();
        let mistakes = state.questions.filter((q) => {
          const qAttempts = state.attempts.filter((a) => a.questionId === q.id);
          return qAttempts.some((a) => !a.isCorrect);
        });
        if (filters?.domain) mistakes = mistakes.filter((q) => q.domain === filters.domain);
        if (filters?.daysBack) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - filters.daysBack);
          mistakes = mistakes.filter((q) => {
            const qAttempts = state.attempts.filter((a) => a.questionId === q.id);
            return qAttempts.some((a) => new Date(a.createdAt) > cutoffDate);
          });
        }
        if (filters?.neverCorrected) mistakes = mistakes.filter((q) => (q.timesCorrect || 0) === 0);
        return mistakes;
      },
      syncFromServer: async () => {
        try {
          const res = await fetch("/api/questions", { cache: "no-store" });
          if (!res.ok) return get().questions.length;
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const currentQuestions = get().questions;
            const norm = data.map((q: any) => {
              const local = currentQuestions.find(cq => cq.id === q.id);
              return {
                ...q,
                choices: typeof q.choices === "string" ? JSON.parse(q.choices) : q.choices,
                tags: typeof q.tags === "string" ? JSON.parse(q.tags) : q.tags || [],
                timesAnswered: local?.timesAnswered || 0,
                timesCorrect: local?.timesCorrect || 0,
                mastery: local?.mastery || 0,
                favorite: local?.favorite || false,
                lastReviewed: local?.lastReviewed || null,
              };
            });
            set({ questions: norm });
            return norm.length;
          }
          return get().questions.length;
        } catch {
          return get().questions.length;
        }
      },
    }),
    {
      name: "sat-nexus-bank-v8",
      storage: createJSONStorage(() => localStorage),
      version: 8,
      partialize: (s) => ({
        questions: s.questions,
        attempts: s.attempts || [],
        questionNotes: s.questionNotes || {},
        collections: s.collections || [],
        studySessions: s.studySessions || [],
        streak: s.streak,
        achievements: s.achievements || [],
      }),
    }
  )
);
