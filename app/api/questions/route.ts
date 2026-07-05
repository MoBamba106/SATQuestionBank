import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const qs = await prisma.question.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
  return NextResponse.json(qs.map(q=>({...q, choices: q.choices?JSON.parse(q.choices):null, tags: q.tags?JSON.parse(q.tags):[] })));
}
export async function POST(req: Request) {
  const body = await req.json();
  const created = await prisma.question.create({
    data: {
      id: body.id,
      questionText: body.questionText,
      passage: body.passage ?? null,
      imageUrl: body.imageUrl ?? null,
      mathExpression: body.mathExpression ?? null,
      choices: body.choices ? JSON.stringify(body.choices) : null,
      correctAnswer: body.correctAnswer,
      explanation: body.explanation ?? "",
      difficulty: body.difficulty ?? "Medium",
      domain: body.domain,
      skill: body.skill,
      subskill: body.subskill ?? null,
      source: body.source ?? null,
      tags: JSON.stringify(body.tags ?? []),
      type: body.type ?? "multiple_choice",
    }
  });
  return NextResponse.json(created);
}
