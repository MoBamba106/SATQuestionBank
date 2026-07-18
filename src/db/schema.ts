import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";

export const questions = pgTable(
  "questions",
  {
    id: text("id").primaryKey(),
    questionText: text("question_text").notNull().default(""),
    questionHtml: text("question_html"),
    passage: text("passage"),
    passageHtml: text("passage_html"),
    correctAnswer: text("correct_answer").notNull(),
    explanation: text("explanation"),
    difficulty: text("difficulty").notNull().default("Medium"),
    domain: text("domain").notNull(),
    skill: text("skill").notNull(),
    subskill: text("subskill"),
    source: text("source"),
    type: text("type").notNull().default("multiple_choice"),
    choices: jsonb("choices"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("questions_domain_idx").on(t.domain),
    index("questions_skill_idx").on(t.skill),
    index("questions_difficulty_idx").on(t.difficulty),
    index("questions_subskill_idx").on(t.subskill),
  ],
);

export const favorites = pgTable("favorites", {
  questionId: text("question_id")
    .primaryKey()
    .references(() => questions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  questionId: text("question_id")
    .primaryKey()
    .references(() => questions.id, { onDelete: "cascade" }),
  note: text("note").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const collections = pgTable("collections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const collectionItems = pgTable(
  "collection_items",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.questionId] })],
);

export const quizSessions = pgTable("quiz_sessions", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull().default("practice"),
  label: text("label"),
  testId: text("test_id"),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctCount: integer("correct_count"),
  answeredCount: integer("answered_count"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => quizSessions.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    isCorrect: boolean("is_correct").notNull(),
    answer: text("answer"),
    mode: text("mode").notNull().default("practice"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // One graded attempt per question per quiz session — re-clicking
    // "Check Answer" on the same question can never double-count stats.
    uniqueIndex("attempts_session_question_unique").on(t.sessionId, t.questionId),
    index("attempts_question_idx").on(t.questionId),
    index("attempts_created_idx").on(t.createdAt),
  ],
);

export const practiceTests = pgTable("practice_tests", {
  id: text("id").primaryKey(),
  testNumber: integer("test_number").notNull(),
  title: text("title").notNull(),
  releaseLabel: text("release_label"),
  rwMinutes: integer("rw_minutes").notNull().default(64),
  mathMinutes: integer("math_minutes").notNull().default(70),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const practiceTestQuestions = pgTable(
  "practice_test_questions",
  {
    testId: text("test_id")
      .notNull()
      .references(() => practiceTests.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    module: text("module").notNull(), // rw1 | rw2 | math1 | math2
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.testId, t.position] }),
    index("ptq_test_idx").on(t.testId),
  ],
);

export type QuestionRow = typeof questions.$inferSelect;
export type AttemptRow = typeof attempts.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
