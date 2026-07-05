import type { OCRResult, SATQuestion } from "@/lib/types";

export interface OcrEngine {
  recognize(file: File | Blob | string): Promise<{ text: string; confidence: number }>;
  name: string;
}

// Smarter College Board parser — knows exactly what to extract.
export async function parseSATFromText(raw: string, confidence: number): Promise<OCRResult> {
  const warnings: string[] = [];
  let text = raw.replace(/\r/g, "\n").replace(/\u00A0/g, " ").trim();

  // 1. Question ID
  const idMatch = text.match(/Question ID[:\s]*([a-z0-9]{6,10})/i)
    || text.match(/\bID[:\s]*([a-z0-9]{6,10})/i)
    || text.match(/\b([a-f0-9]{8})\b/i);
  const id = idMatch ? idMatch[1].toLowerCase() : `ocr-${Math.random().toString(36).slice(2,8)}`;

  // 2. Domain / Skill / Subskill — official CB taxonomy only
  let domain: SATQuestion["domain"] = /Reading|Writing|English|passage|text|author/i.test(text) && !/math|equation|function/i.test(text.slice(0,400)) ? "Reading & Writing" : "Math";
  let skill = domain === "Math" ? "Algebra" : "Information and Ideas";
  let subskill = "Linear equations in one variable";

  const skillMap: [RegExp, string, string][] = [
    [/Systems of two linear equations in two variables/i, "Algebra", "Systems of two linear equations in two variables"],
    [/Linear equations in two variables/i, "Algebra", "Linear equations in two variables"],
    [/Linear equations in one variable/i, "Algebra", "Linear equations in one variable"],
    [/Linear functions/i, "Algebra", "Linear functions"],
    [/Linear inequalities/i, "Algebra", "Linear inequalities in one or two variables"],
    [/Nonlinear functions/i, "Advanced Math", "Nonlinear functions"],
    [/Equivalent expressions/i, "Advanced Math", "Equivalent expressions"],
    [/Ratios, rates/i, "Problem-Solving and Data Analysis", "Ratios, rates, proportional relationships, and units"],
    [/Problem-Solving and Data Analysis/i, "Problem-Solving and Data Analysis", "Ratios, rates, proportional relationships, and units"],
    [/Geometry and Trigonometry/i, "Geometry and Trigonometry", "Lines, angles, and triangles"],
    [/Information and Ideas/i, "Information and Ideas", "Central Ideas and Details"],
    [/Craft and Structure/i, "Craft and Structure", "Words in Context"],
    [/Expression of Ideas/i, "Expression of Ideas", "Transitions"],
    [/Standard English Conventions/i, "Standard English Conventions", "Boundaries"],
  ];
  for (const [re, sk, sub] of skillMap) if (re.test(text)) { skill = sk; subskill = sub; if (sk==="Algebra"||sk==="Advanced Math"||sk.includes("Problem")||sk.includes("Geometry")) domain="Math"; else domain="Reading & Writing"; break; }

  // 3. Difficulty
  let difficulty: SATQuestion["difficulty"] = "Medium";
  if (/Question Difficulty:\s*Hard/i.test(text) && !/Very Hard/i.test(text)) difficulty = "Hard";
  if (/Very Hard/i.test(text)) difficulty = "Very Hard";
  if (/\bEasy\b/i.test(text)) difficulty = "Easy";

  // 4. Isolate question stem — strip answer / rationale blocks
  let stem = text
    .split(/Correct Answer:|Rationale|Answer Explanation|Question Difficulty:|Choice [A-D] is (correct|incorrect)/i)[0];
  // Remove header metadata noise
  stem = stem
    .replace(/Question ID[\s\S]{0,40}?\n/gi, "")
    .replace(/Assessment[\s\S]{0,120}?Difficulty/gi, "")
    .replace(/SAT\s*\n*Math\s*\n*Algebra/gi, "")
    .trim();
  // take last substantial paragraph block as question
  const paragraphs = stem.split(/\n{2,}/).map(s=>s.trim()).filter(Boolean);
  let questionText = paragraphs.slice(-3).join("\n\n").slice(0, 1400);
  if (questionText.length < 30) questionText = stem.slice(0, 800);

  // 5. Answer choices A-D — robust multi-line
  const choicesFound: {key:"A"|"B"|"C"|"D", text:string}[] = [];
  // Pattern: line starting with A. / A) / A  —
  const choiceBlock = text.match(/A[\.\)]\s*[\s\S]*?D[\.\)]\s*[\s\S]{1,200}/i);
  const choiceSource = choiceBlock ? choiceBlock[0] : text;
  const reChoice = /(?:^|\n)\s*([A-D])[\.\)\]\:]\s*([^\n]+(?:\n(?![A-D][\.\)\]])[^\n]+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = reChoice.exec(choiceSource)) !== null) {
    const k = m[1] as "A"|"B"|"C"|"D";
    let v = m[2].replace(/\s+/g, " ").trim().slice(0, 240);
    if (v && !choicesFound.find(c=>c.key===k)) choicesFound.push({key:k, text:v});
  }
  // fallback: detect "A\n ..." isolated
  if (choicesFound.length < 2) {
    const alt = [...text.matchAll(/\b([A-D])\s*\n([^\nA-D]{1,120})/g)];
    alt.forEach(a=>{
      const k=a[1] as any; const v=a[2].trim();
      if(!choicesFound.find(c=>c.key===k) && v.length>0) choicesFound.push({key:k, text:v});
    });
  }

  // 6. Correct answer — try multiple CB formats
  let correctAnswer = "";
  const caPatterns = [
    /Correct Answer:\s*([A-D])\b/i,
    /Correct Answer:\s*([0-9\-.\/]{1,8})/i,
    /The correct answer is\s+([A-D0-9\-.\/]+)/i,
    /Answer\s*[:\-]\s*([A-D])\b/i,
    /Choice\s+([A-D])\s+is correct/i,
  ];
  for (const p of caPatterns) {
    const mm = text.match(p);
    if (mm) { correctAnswer = mm[1].toUpperCase(); break; }
  }
  if (!correctAnswer) {
    // if multiple choice detected but no explicit answer, leave blank for manual
    correctAnswer = choicesFound.length ? "" : "";
    warnings.push("Correct answer not detected — please fill answer box manually.");
  }

  // 7. Free-response numeric fallback
  if (choicesFound.length < 2 && /^\d+$/.test(correctAnswer||"")) {
    // good — SPR
  }

  if (choicesFound.length >=2 && choicesFound.length <4) warnings.push(`Only ${choicesFound.length}/4 choices detected — review answer boxes.`);
  if (confidence < 75) warnings.push(`OCR confidence ${confidence.toFixed(0)}% — verify fields.`);

  const isMCQ = choicesFound.length >= 2;

  const fields: Partial<SATQuestion> = {
    id,
    questionText: questionText || "Edit question text here…",
    passage: /The following text|passage|adapted from/i.test(text) ? "Paste passage here…" : null,
    choices: isMCQ ? choicesFound.sort((a,b)=>a.key.localeCompare(b.key)) : undefined,
    correctAnswer: correctAnswer || (isMCQ ? "A" : ""),
    difficulty,
    domain,
    skill,
    subskill,
    type: isMCQ ? "multiple_choice" : "free_response",
    explanation: "",
    tags: []
  };

  return { confidence, rawText: raw, fields, warnings };
}
