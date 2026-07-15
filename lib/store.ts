"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SATQuestion } from "./types";
import { SEED_QUESTIONS } from "./mock-data";

type Attempt = {
  id: string;
  questionId: string;
  isCorrect: boolean;
  answer?: string;
  checkedAnswer?: string;
  mode?: "practice" | "exam";
  createdAt: string;
};

type BankState = {
  questions: SATQuestion[];
  attempts: Attempt[];
  setQuestions: (q:SATQuestion[])=>void;
  upsert: (q:SATQuestion)=>void;
  remove: (id:string)=>void;
  clearSynthetic: ()=>void;
  syncFromServer: ()=>Promise<number>;
  recordAttempt: (id: string, isCorrect: boolean, meta?: Partial<Attempt>) => void;
  customQuizPool: string[] | null;
  setCustomQuizPool: (ids: string[] | null) => void;
  questionNotes: Record<string, string>;
  setQuestionNote: (id: string, note: string) => void;
  toggleFavorite: (id: string) => void;
};

export const useBank = create<BankState>()(
  persist(
    (set, get) => ({
      questions: SEED_QUESTIONS,
      setQuestions: (questions) => set({ questions }),
      upsert: (q) => set(state => {
        const idx = state.questions.findIndex(x=>x.id===q.id);
        if (idx>=0) {
          const copy=[...state.questions]; copy[idx]=q; return { questions: copy };
        }
        return { questions: [q, ...state.questions] };
      }),
      remove: (id)=> set(s=>({ questions: s.questions.filter(x=>x.id!==id)})),
      clearSynthetic: () => set(s=>({
        questions: s.questions.filter(q=> !q.id.startsWith("syn-") && !/^syn/.test(q.id))
      })),
      attempts: [],
      recordAttempt: (id, isCorrect, meta = {}) => set(state => {
        const idx = state.questions.findIndex(x => x.id === id);
        if (idx === -1) return {};

        const q = state.questions[idx];
        const newTimesAnswered = (q.timesAnswered || 0) + 1;
        const newTimesCorrect = (q.timesCorrect || 0) + (isCorrect ? 1 : 0);
        const newMastery = Math.round((newTimesCorrect / newTimesAnswered) * 100);

        const newAttempt: any = {
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

        return {
          questions: copy,
          attempts: [...state.attempts, newAttempt],
        };
      }),
      customQuizPool: null,
      setCustomQuizPool: (ids) => set({ customQuizPool: ids }),
      questionNotes: {},
      setQuestionNote: (id, note) => set(state => ({
        questionNotes: { ...state.questionNotes, [id]: note }
      })),
      toggleFavorite: (id) => set(state => {
        const idx = state.questions.findIndex(x => x.id === id);
        if (idx === -1) return {};
        const copy = [...state.questions];
        copy[idx] = { ...copy[idx], favorite: !copy[idx].favorite };
        return { questions: copy };
      }),
      syncFromServer: async () => {
        try {
          const res = await fetch("/api/questions", { cache: "no-store" });
          if (!res.ok) return get().questions.length;
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // normalize choices/tags if stringified
            const norm = data.map((q:any)=>({
              ...q,
              choices: typeof q.choices === "string" ? JSON.parse(q.choices) : q.choices,
              tags: typeof q.tags === "string" ? JSON.parse(q.tags) : (q.tags||[]),
              timesAnswered: 0,
              timesCorrect: 0,
              mastery: 0,
            }));
            // only replace if server has more, or if user explicitly synced
            if (norm.length >= get().questions.length || norm.length > 3) {
              set({ questions: norm });
            }
            return norm.length;
          }
          return get().questions.length;
        } catch { return get().questions.length; }
      }
    }),
    {
      name: "sat-nexus-bank-v5",
      storage: createJSONStorage(()=>localStorage),
      version: 5,
      migrate: (persisted:any, version:number)=>{
        // wipe synthetic on any old version, reset stats, force fresh
        if (persisted?.state?.questions) {
          persisted.state.questions = persisted.state.questions.filter((q:any)=> !String(q.id).startsWith("syn-"));
          // zero fake stats
          persisted.state.questions = persisted.state.questions.map((q:any)=>({
            ...q,
            timesAnswered: 0,
            timesCorrect: 0,
            mastery: 0,
            avgResponseMs: undefined,
            lastReviewed: null,
            favorite: false
          }));
        }
        return persisted;
      },
      partialize: (s) => ({
        questions: s.questions,
        attempts: s.attempts || [],
        questionNotes: s.questionNotes || {},
      })
    }
  )
);

// auto-clean synthetic on import (client)
if (typeof window !== "undefined") {
  setTimeout(()=>{
    try {
      const st = useBank.getState();
      const hasSyn = st.questions.some(q=>q.id.startsWith("syn-"));
      if (hasSyn) st.clearSynthetic();
    } catch {}
  }, 50);
}
