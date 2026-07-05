import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(_:Request, {params}:{params:{id:string}}){
  const q = await prisma.question.findUnique({ where:{ id: params.id }});
  if(!q) return NextResponse.json({error:"not found"},{status:404});
  return NextResponse.json(q);
}
export async function PUT(req:Request, {params}:{params:{id:string}}){
  const body = await req.json();
  const q = await prisma.question.update({ where:{ id: params.id }, data: body });
  return NextResponse.json(q);
}
export async function DELETE(_:Request, {params}:{params:{id:string}}){
  await prisma.question.delete({ where:{ id: params.id }});
  return NextResponse.json({ok:true});
}
