import vocabulary from "@/data/vocabulary.json";

export type StudyTopic = "Vocabulary" | "Grammar" | "Math formulas" | "Test strategy";
export type VocabularyDifficulty = "Easy" | "Medium" | "Hard";

export type StudyItem = {
  id: string;
  topic: StudyTopic;
  term: string;
  definition: string;
  example?: string;
  phonetic?: string;
  difficulty?: VocabularyDifficulty;
};

const VOCABULARY_ITEMS: StudyItem[] = vocabulary.map((item) => ({
  ...item,
  topic: "Vocabulary" as const,
  difficulty: item.difficulty as VocabularyDifficulty,
}));

export const STUDY_ITEMS: StudyItem[] = [
  ...VOCABULARY_ITEMS,

  { id: "g-boundary", topic: "Grammar", term: "Sentence boundaries", definition: "Join two independent clauses with a period, semicolon, or comma plus a coordinating conjunction.", example: "The trial ended; the researchers analyzed the results." },
  { id: "g-colon", topic: "Grammar", term: "Colon", definition: "Use a colon after a complete clause to introduce an explanation, example, or list." },
  { id: "g-dash", topic: "Grammar", term: "Dash pair", definition: "Two dashes can set off nonessential information; removing that information should leave a complete sentence." },
  { id: "g-agreement", topic: "Grammar", term: "Subject–verb agreement", definition: "Match the verb to the true subject, ignoring interrupting phrases." },
  { id: "g-modifier", topic: "Grammar", term: "Modifier placement", definition: "Place a descriptive phrase next to the word it logically modifies." },
  { id: "g-pronoun", topic: "Grammar", term: "Pronoun clarity", definition: "Every pronoun must refer clearly and consistently to a noun." },
  { id: "g-transition", topic: "Grammar", term: "Transitions", definition: "Choose transitions by logical relationship: addition, contrast, cause, example, or sequence." },

  { id: "m-slope", topic: "Math formulas", term: "Slope", definition: "m = (y₂ − y₁) / (x₂ − x₁)", example: "Use two points to find a line's rate of change." },
  { id: "m-quadratic", topic: "Math formulas", term: "Quadratic formula", definition: "x = (−b ± √(b² − 4ac)) / 2a" },
  { id: "m-vertex", topic: "Math formulas", term: "Vertex form", definition: "y = a(x − h)² + k", example: "The vertex is (h, k)." },
  { id: "m-percent", topic: "Math formulas", term: "Percent change", definition: "(new − original) / original × 100%" },
  { id: "m-distance", topic: "Math formulas", term: "Distance formula", definition: "d = √((x₂ − x₁)² + (y₂ − y₁)²)" },
  { id: "m-circle", topic: "Math formulas", term: "Circle equation", definition: "(x − h)² + (y − k)² = r²" },
  { id: "m-exponential", topic: "Math formulas", term: "Exponential growth", definition: "y = a(1 + r)ᵗ", example: "For decay, use 1 − r." },
  { id: "m-special", topic: "Math formulas", term: "Special right triangles", definition: "45-45-90: x, x, x√2. 30-60-90: x, x√3, 2x." },

  { id: "s-evidence", topic: "Test strategy", term: "Prove every answer", definition: "Choose the option directly supported by the text or math, not the one that merely sounds reasonable." },
  { id: "s-eliminate", topic: "Test strategy", term: "Eliminate precisely", definition: "Name the specific flaw in each rejected choice: unsupported, too broad, reversed, or irrelevant." },
  { id: "s-time", topic: "Test strategy", term: "Protect your time", definition: "Mark a slow question, make your best choice, and return after securing easier points." },
  { id: "s-desmos", topic: "Test strategy", term: "Use Desmos deliberately", definition: "Graph equations, find intersections, and build regressions when that is faster than symbolic work." },
  { id: "s-context", topic: "Test strategy", term: "Words in context", definition: "Cover the target word, predict a simple replacement, then compare the choices." },
  { id: "s-reread", topic: "Test strategy", term: "Reread the task", definition: "Before submitting, verify whether the question asks for a value, expression, inference, or supporting choice." },
];
