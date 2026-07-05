import { PrismaClient } from "@prisma/client";
import { SEED_QUESTIONS } from "../lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  for (const q of SEED_QUESTIONS) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        questionText: q.questionText,
        passage: q.passage ?? null,
        imageUrl: q.imageUrl ?? null,
        mathExpression: q.mathExpression ?? null,
        choices: q.choices ? JSON.stringify(q.choices) : null,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        domain: q.domain,
        skill: q.skill,
        subskill: q.subskill,
        source: q.source,
        tags: JSON.stringify(q.tags),
        timesAnswered: q.timesAnswered,
        timesCorrect: q.timesCorrect,
        avgResponseMs: q.avgResponseMs ?? null,
        mastery: q.mastery,
        lastReviewed: q.lastReviewed ? new Date(q.lastReviewed) : null,
        createdAt: new Date(q.createdAt),
        type: q.type,
        favorite: !!q.favorite
      }
    });
  }
  console.log(`Seeded ${SEED_QUESTIONS.length} questions`);
}

main().finally(()=>prisma.$disconnect());
