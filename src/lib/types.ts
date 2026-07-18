export type QuestionType = "multiple_choice" | "free_response";

export interface Choice {
  key: string;
  text: string;
  html?: string | null;
}

/** Client shape of a question (as served by the API). */
export interface SATQuestion {
  id: string;
  questionText: string;
  questionHtml: string | null;
  passage: string | null;
  passageHtml: string | null;
  choices: Choice[] | null;
  correctAnswer: string;
  explanation: string | null;
  difficulty: "Easy" | "Medium" | "Hard" | string;
  domain: "Math" | "Reading & Writing" | string;
  skill: string;
  subskill: string | null;
  source: string | null;
  type: QuestionType;
  favorite: boolean;
  note: string | null;
  timesAnswered: number;
  timesCorrect: number;
  mastery: number;
  lastAttemptAt: string | null;
}

export interface QuestionSummary {
  total: number;
  page: number;
  pageSize: number;
  questions: SATQuestion[];
}

export interface StudyCollection {
  id: string;
  name: string;
  description: string | null;
  questionIds: string[];
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeTestInfo {
  id: string;
  testNumber: number;
  title: string;
  releaseLabel: string | null;
  rwMinutes: number;
  mathMinutes: number;
  totalQuestions: number;
  rwQuestions: number;
  mathQuestions: number;
}

export interface PracticeTestDetail extends PracticeTestInfo {
  modules: {
    rw1: SATQuestion[];
    rw2: SATQuestion[];
    math1: SATQuestion[];
    math2: SATQuestion[];
  };
}

export interface SessionSummary {
  id: string;
  mode: string;
  label: string | null;
  testId: string | null;
  totalQuestions: number;
  correctCount: number | null;
  answeredCount: number | null;
  startedAt: string;
  finishedAt: string | null;
  attempts: {
    questionId: string;
    isCorrect: boolean;
    answer: string | null;
    createdAt: string;
  }[];
}

export interface StatsPayload {
  uniqueQuestions: number;
  totalAttempts: number;
  totalCorrect: number;
  accuracy: number;
  mistakesCount: number;
  favoritesCount: number;
  collectionsCount: number;
  sessionsCount: number;
  streak: { current: number; longest: number };
  byDomain: { domain: string; total: number; correct: number }[];
  bySkill: { skill: string; domain: string; total: number; correct: number }[];
  byDifficulty: { difficulty: string; total: number; correct: number }[];
  activity: { date: string; attempts: number; correct: number }[];
  recentSessions: SessionSummary[];
}
