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

/** Auth provider user profiles mirrored into Postgres. */
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Supabase auth uid (or guest id)
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  /** When true this account is excluded from public leaderboards. */
  hideLeaderboard: boolean("hide_leaderboard").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** User-submitted complaints / improvement requests. */
export const feedback = pgTable(
  "feedback",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email"),
    category: text("category").notNull().default("improvement"), // complaint | improvement | bug | other
    title: text("title").notNull(),
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("new"), // new | reviewed | done
    githubIssueUrl: text("github_issue_url"),
    /** Human-readable context captured when the feedback was filed (e.g. the
     *  quiz/test/flashcard and question the user was on). */
    context: text("context"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("feedback_created_idx").on(t.createdAt)],
);

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

export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.questionId] }),
    index("favorites_user_idx").on(t.userId),
  ],
);

export const notes = pgTable(
  "notes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    note: text("note").notNull().default(""),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId] })],
);

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon").notNull().default("folder"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("collections_user_idx").on(t.userId)],
);

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

export const quizSessions = pgTable(
  "quiz_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: text("mode").notNull().default("practice"),
    label: text("label"),
    testId: text("test_id"),
    totalQuestions: integer("total_questions").notNull().default(0),
    correctCount: integer("correct_count"),
    answeredCount: integer("answered_count"),
    adaptivePath: jsonb("adaptive_path"),
    totalScore: integer("total_score"),
    rwScore: integer("rw_score"),
    mathScore: integer("math_score"),
    skillBands: jsonb("skill_bands"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

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
    uniqueIndex("attempts_session_question_unique").on(t.sessionId, t.questionId),
    index("attempts_question_idx").on(t.questionId),
    index("attempts_created_idx").on(t.createdAt),
  ],
);

export const practiceTests = pgTable("practice_tests", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  testNumber: integer("test_number").notNull(),
  title: text("title").notNull(),
  releaseLabel: text("release_label"),
  isCustom: boolean("is_custom").notNull().default(false),
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
    module: text("module").notNull(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.testId, t.position] }),
    index("ptq_test_idx").on(t.testId),
  ],
);

export const userPresence = pgTable(
  "user_presence",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("user_presence_last_seen_idx").on(t.lastSeen)],
);

export const sharedQuestions = pgTable(
  "shared_questions",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [
    index("shared_questions_to_user_idx").on(t.toUserId),
    index("shared_questions_from_user_idx").on(t.fromUserId),
    index("shared_questions_expires_idx").on(t.expiresAt),
  ],
);

export const sharedCollections = pgTable(
  "shared_collections",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("shared_collections_to_user_idx").on(t.toUserId),
    index("shared_collections_from_user_idx").on(t.fromUserId),
  ],
);

/**
 * Shareable quiz snapshots. Anyone with the token can open the same question set.
 * Optional toUserId supports in-app delivery (mirrors shared questions/collections).
 */
export const sharedQuizzes = pgTable(
  "shared_quizzes",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id").references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Shared quiz"),
    mode: text("mode").notNull().default("practice"),
    questionIds: jsonb("question_ids").notNull().$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [
    uniqueIndex("shared_quizzes_token_uidx").on(t.token),
    index("shared_quizzes_to_user_idx").on(t.toUserId),
    index("shared_quizzes_from_user_idx").on(t.fromUserId),
    index("shared_quizzes_expires_idx").on(t.expiresAt),
  ],
);

/**
 * Real-time quiz duels. questionIds is a frozen snapshot for the match.
 * status: pending | active | completed | declined | cancelled | expired
 */
export const duels = pgTable(
  "duels",
  {
    id: text("id").primaryKey(),
    hostUserId: text("host_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    guestUserId: text("guest_user_id").references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    label: text("label").notNull().default("Quiz duel"),
    domain: text("domain"),
    /** SAT domain category (e.g. Algebra, Craft and Structure). */
    skill: text("skill"),
    /** Finer skill within a category (subskill). */
    category: text("category"),
    difficulty: text("difficulty"),
    questionCount: integer("question_count").notNull().default(10),
    questionIds: jsonb("question_ids").notNull().$type<string[]>(),
    hostScore: integer("host_score").notNull().default(0),
    guestScore: integer("guest_score").notNull().default(0),
    currentIndex: integer("current_index").notNull().default(0),
    /** Per-question lock: { [questionId]: { userId, answer, correct, at } } */
    answers: jsonb("answers").notNull().default({}).$type<Record<string, unknown>>(),
    winnerUserId: text("winner_user_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [
    index("duels_host_idx").on(t.hostUserId),
    index("duels_guest_idx").on(t.guestUserId),
    index("duels_status_idx").on(t.status),
  ],
);

export type QuestionRow = typeof questions.$inferSelect;
export type AttemptRow = typeof attempts.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type DuelRow = typeof duels.$inferSelect;
