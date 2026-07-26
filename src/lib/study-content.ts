export type StudyTopic = "Vocabulary" | "Grammar" | "Math formulas" | "Test strategy";

export type StudyItem = {
  id: string;
  topic: StudyTopic;
  term: string;
  definition: string;
  example?: string;
};

export const STUDY_ITEMS: StudyItem[] = [
  { id: "v-abate", topic: "Vocabulary", term: "abate", definition: "to become less intense or widespread", example: "The storm began to abate before sunrise." },
  { id: "v-ambivalent", topic: "Vocabulary", term: "ambivalent", definition: "having mixed or contradictory feelings", example: "She was ambivalent about changing schools." },
  { id: "v-bolster", topic: "Vocabulary", term: "bolster", definition: "to support or strengthen", example: "The new evidence bolstered the argument." },
  { id: "v-corroborate", topic: "Vocabulary", term: "corroborate", definition: "to confirm with additional evidence", example: "The records corroborate the scientist's account." },
  { id: "v-delineate", topic: "Vocabulary", term: "delineate", definition: "to describe or mark precisely", example: "The author delineates the stages of the process." },
  { id: "v-empirical", topic: "Vocabulary", term: "empirical", definition: "based on observation or experiment", example: "The claim lacks empirical support." },
  { id: "v-equivocal", topic: "Vocabulary", term: "equivocal", definition: "ambiguous or open to more than one interpretation", example: "The study produced equivocal results." },
  { id: "v-exacerbate", topic: "Vocabulary", term: "exacerbate", definition: "to make a problem worse", example: "The drought exacerbated food shortages." },
  { id: "v-infer", topic: "Vocabulary", term: "infer", definition: "to reach a conclusion from evidence", example: "Readers can infer the speaker's frustration." },
  { id: "v-mitigate", topic: "Vocabulary", term: "mitigate", definition: "to make less severe", example: "Trees can mitigate urban heat." },
  { id: "v-nuance", topic: "Vocabulary", term: "nuance", definition: "a subtle distinction or variation", example: "The translation preserves the poem's nuance." },
  { id: "v-pragmatic", topic: "Vocabulary", term: "pragmatic", definition: "focused on practical results", example: "They adopted a pragmatic solution." },
  { id: "v-refute", topic: "Vocabulary", term: "refute", definition: "to prove a statement incorrect", example: "Later findings refuted the original hypothesis." },
  { id: "v-substantiate", topic: "Vocabulary", term: "substantiate", definition: "to support with evidence", example: "The data substantiate the conclusion." },
  { id: "v-ubiquitous", topic: "Vocabulary", term: "ubiquitous", definition: "present or found everywhere", example: "Mobile devices have become ubiquitous." },

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
