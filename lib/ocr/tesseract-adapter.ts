"use client";
import Tesseract from "tesseract.js";
import type { OcrEngine } from "./engine";

export const tesseractEngine: OcrEngine = {
  name: "tesseract.js v5",
  async recognize(input) {
    const { data } = await Tesseract.recognize(input as any, "eng", {
      // @ts-ignore
      logger: () => {}
    });
    return { text: data.text, confidence: data.confidence };
  }
};
