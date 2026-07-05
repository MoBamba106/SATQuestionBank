import { PrismaClient } from "@prisma/client";
import fs from "fs";
const prisma = new PrismaClient();
async function main(){
  const data = JSON.parse(fs.readFileSync("prisma/cb-full.json","utf8"));
  console.log(`Seeding ${data.length} CB questions…`);
  for (const q of data) {
    const qText = q.questionHtml || q.questionText;
    const passage = q.passageHtml || q.passage || null;
    const expl = q.explanationHtml || q.explanation || "";
    await prisma.question.upsert({
      where:{ id: q.id },
      update:{
        questionText: qText,
        passage,
        explanation: expl.slice(0,8000),
        choices: q.choices ? JSON.stringify(q.choices) : null,
        correctAnswer: String(q.correctAnswer || ""),
        difficulty: q.difficulty,
        domain: q.domain,
        skill: q.skill,
        subskill: q.subskill,
      },
      create:{
        id: q.id,
        questionText: qText,
        passage,
        imageUrl: q.imageUrl,
        mathExpression: q.mathExpression,
        choices: q.choices ? JSON.stringify(q.choices) : null,
        correctAnswer: String(q.correctAnswer || ""),
        explanation: expl.slice(0,8000),
        difficulty: q.difficulty,
        domain: q.domain,
        skill: q.skill,
        subskill: q.subskill,
        source: q.source,
        tags: JSON.stringify(q.tags||[]),
        timesAnswered:0, timesCorrect:0, mastery:0,
        type: q.type,
        favorite:false
      }
    });
  }
  console.log("Done");
}
main().finally(()=>prisma.$disconnect());
