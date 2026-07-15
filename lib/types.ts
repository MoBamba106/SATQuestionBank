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
  mode?: "practice" | "exam";
  createdAt: string;
}

export interface StudyCollection {
  id: string;
  name: string;
  questionIds: string[];
  createdAt: string;
  updatedAt: string;
}
