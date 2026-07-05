import { NextResponse } from "next/server";
// Server-side OCR placeholder — client uses tesseract.js directly.
// Swap here for Vision API / Textract.
export async function POST() {
  return NextResponse.json({ message: "Use client-side tesseractEngine. Server adapter is modular." });
}
