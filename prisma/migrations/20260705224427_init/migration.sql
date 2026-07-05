-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionText" TEXT NOT NULL,
    "passage" TEXT,
    "imageUrl" TEXT,
    "mathExpression" TEXT,
    "choices" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "subskill" TEXT,
    "source" TEXT,
    "tags" TEXT,
    "timesAnswered" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "avgResponseMs" INTEGER,
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "lastReviewed" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'multiple_choice',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "chosen" TEXT,
    "correct" BOOLEAN NOT NULL,
    "responseMs" INTEGER,
    "confidence" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testNumber" TEXT NOT NULL,
    "dateTaken" DATETIME NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "rwScore" INTEGER NOT NULL,
    "mathScore" INTEGER NOT NULL,
    "timeSpentMin" INTEGER,
    "correctCount" INTEGER,
    "incorrectCount" INTEGER,
    "breakdownJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
