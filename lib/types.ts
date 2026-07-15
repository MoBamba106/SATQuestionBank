export type QuestionType = "multiple_choice" | "free_response";

export interface SATQuestion {
  id: string; // e.g. ac472881
  questionText: string;
  passage?: string | null;
  imageUrl?: string | null;
  mathExpression?: string | null;
  choices?: { key: "A"|"B"|"C"|"D"; text: string }[];
  correctAnswer: string; // "D" or "403"
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Very Hard";
  domain: "Math" | "Reading & Writing";
  skill: string; // e.g. "Algebra"
  subskill: string; // e.g. "Linear equations in one variable"
  source?: string;
  tags: string[];
  timesAnswered: number;
  timesCorrect: number;
  avgResponseMs?: number;
  mastery: number; // 0-100
  lastReviewed?: string | null;
  createdAt: string;
  type: QuestionType;
  favorite?: boolean;
  notes?: string;
  collections?: string[]; // collection IDs
}

export interface OCRResult {
  confidence: number;
  fields: Partial<SATQuestion>;
  rawText: string;
  warnings: string[];
}

export interface QuestionAttempt {
  id: string;
  questionId: string;
  isCorrect: boolean;
  answer?: string;
  checkedAnswer?: string;
  domain?: SATQuestion["domain"];
  skill?: string;
  difficulty?: SATQuestion["difficulty"];
  mode?: "practice" | "exam" | "bluebook";
  createdAt: string;
}

export interface QuestionHistory {
  questionId: string;
  attempts: QuestionAttempt[];
  timesAnswered: number;
  timesCorrect: number;
  mastery: number;
  lastReviewed?: string;
}

export interface StudyCollection {
  id: string;
  name: string;
  description?: string;
  questionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  name: string;
  description?: string;
  questionIds: string[];
  duration?: number; // in minutes
  createdAt: string;
}

export interface Streak {
  id: string;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon?: string;
  unlockedAt?: string;
  createdAt: string;
}

export interface PracticeTestData {
  id: string;
  testNumber: string;
  dateTaken: string;
  totalScore: number;
  rwScore: number;
  mathScore: number;
  timeSpentMin?: number;
  correctCount?: number;
  incorrectCount?: number;
  breakdownJson?: string;
  questionAnswers?: Array<{
    questionId: string;
    chosen: string;
    correct: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}
