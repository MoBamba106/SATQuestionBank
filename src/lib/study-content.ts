import vocabulary from "@/data/vocabulary.json";

export type StudyTopic = "Vocabulary" | "Grammar" | "Math formulas" | "Test strategy" | "Reading & Writing Module 1" | "Reading & Writing Module 2" | "Math Module 1" | "Math Module 2";
export type VocabularyDifficulty = "Easy" | "Medium" | "Hard";

export type StudyItem = {
  id: string;
  topic: StudyTopic;
  term: string;
  /** Primary definition (first Merriam-Webster-aligned sense). */
  definition: string;
  /**
   * All distinct senses for this term (2–3 where applicable), aligned with
   * Merriam-Webster. When present, `definition` is always `definitions[0]`.
   */
  definitions?: string[];
  example?: string;
  phonetic?: string;
  difficulty?: VocabularyDifficulty;
  /**
   * Whether the SAT used this word as the keyed answer or as a distractor in a
   * Words-in-Context question. Both are worth studying — students have to rule
   * distractors out — but answers are the words the test rewards knowing.
   */
  satRole?: "answer" | "distractor";
  /** Question-bank ids this term is tested in. */
  satQuestionIds?: string[];
};

type VocabularyEntry = {
  id: string;
  term: string;
  phonetic?: string;
  difficulty?: string;
  definition: string;
  definitions?: string[];
  example?: string;
  satRole?: string;
  satQuestionIds?: string[];
};

const VOCABULARY_ITEMS: StudyItem[] = (vocabulary as VocabularyEntry[]).map((item) => ({
  ...item,
  topic: "Vocabulary" as const,
  difficulty: item.difficulty as VocabularyDifficulty,
  satRole: item.satRole === "answer" || item.satRole === "distractor" ? item.satRole : undefined,
}));

/** Number of vocabulary cards in the deck (shown in the study library footer). */
export const VOCABULARY_COUNT = VOCABULARY_ITEMS.length;

export const STUDY_ITEMS: StudyItem[] = [
  ...VOCABULARY_ITEMS,

  // Grammar (20+)
  { id: "g-boundary", topic: "Grammar", term: "Sentence boundaries", definition: "Join two independent clauses with a period, semicolon, or comma plus a coordinating conjunction.", example: "The trial ended; the researchers analyzed the results." },
  { id: "g-colon", topic: "Grammar", term: "Colon", definition: "Use a colon after a complete clause to introduce an explanation, example, or list." },
  { id: "g-dash", topic: "Grammar", term: "Dash pair", definition: "Two dashes can set off nonessential information; removing that information should leave a complete sentence." },
  { id: "g-agreement", topic: "Grammar", term: "Subject–verb agreement", definition: "Match the verb to the true subject, ignoring interrupting phrases." },
  { id: "g-modifier", topic: "Grammar", term: "Modifier placement", definition: "Place a descriptive phrase next to the word it logically modifies." },
  { id: "g-pronoun", topic: "Grammar", term: "Pronoun clarity", definition: "Every pronoun must refer clearly and consistently to a noun." },
  { id: "g-transition", topic: "Grammar", term: "Transitions", definition: "Choose transitions by logical relationship: addition, contrast, cause, example, or sequence." },
  { id: "g-dangling", topic: "Grammar", term: "Dangling Modifiers", definition: "An introductory phrase must describe the subject immediately following it.", example: "Walking down the street, the trees were beautiful. (Incorrect)" },
  { id: "g-semicolon", topic: "Grammar", term: "Semicolon vs. Colon", definition: "A semicolon connects two independent clauses. A colon follows an independent clause to introduce a list or explanation." },
  { id: "g-relative", topic: "Grammar", term: "Relative Pronouns", definition: "Use 'who' for people, 'which' or 'that' for things. 'Whose' shows possession." },
  { id: "g-parallelism", topic: "Grammar", term: "Parallel Structure", definition: "Items in a list or comparison must be in the same grammatical form.", example: "I like hiking, swimming, and biking." },
  { id: "g-tense", topic: "Grammar", term: "Verb Tense Consistency", definition: "Keep verb tenses consistent unless the time frame of the action changes." },
  { id: "g-its-it-is", topic: "Grammar", term: "Its vs. It's", definition: "'Its' is possessive. 'It's' is a contraction for 'it is' or 'it has'." },
  { id: "g-there-their-theyre", topic: "Grammar", term: "There, Their, They're", definition: "'There' refers to a place, 'their' is possessive, and 'they're' is a contraction for 'they are'." },
  { id: "g-who-whom", topic: "Grammar", term: "Who vs. Whom", definition: "'Who' functions as a subject (he/she), while 'whom' functions as an object (him/her)." },
  { id: "g-affect-effect", topic: "Grammar", term: "Affect vs. Effect", definition: "'Affect' is typically a verb meaning to influence. 'Effect' is usually a noun meaning a result." },
  { id: "g-comma-splice", topic: "Grammar", term: "Comma Splices", definition: "Do not use a comma to connect two independent clauses. Use a period, semicolon, or conjunction." },
  { id: "g-fewer-less", topic: "Grammar", term: "Fewer vs. Less", definition: "Use 'fewer' for countable items and 'less' for uncountable quantities." },
  { id: "g-farther-further", topic: "Grammar", term: "Farther vs. Further", definition: "'Farther' refers to physical distance, while 'further' refers to figurative distance or degree." },
  { id: "g-good-well", topic: "Grammar", term: "Good vs. Well", definition: "'Good' is an adjective describing a noun. 'Well' is an adverb describing a verb." },
  { id: "g-comparisons", topic: "Grammar", term: "Illogical Comparisons", definition: "Compare similar things.", example: "The population of New York is larger than Chicago. (Incorrect: comparing population to a city)" },
  { id: "g-appositives", topic: "Grammar", term: "Appositives", definition: "An appositive is a noun or noun phrase that renames another noun right beside it. It is usually set off by commas." },
  { id: "g-prepositions", topic: "Grammar", term: "Prepositions at the End of Sentences", definition: "In formal writing, avoid ending a sentence with a preposition, though it is often accepted in casual contexts." },

  // Math formulas
  { id: "m-slope", topic: "Math formulas", term: "Slope", definition: "m = (y₂ − y₁) / (x₂ − x₁)", example: "Use two points to find a line's rate of change." },
  { id: "m-quadratic", topic: "Math formulas", term: "Quadratic formula", definition: "x = (−b ± √(b² − 4ac)) / 2a" },
  { id: "m-vertex", topic: "Math formulas", term: "Vertex form", definition: "y = a(x − h)² + k", example: "The vertex is (h, k)." },
  { id: "m-percent", topic: "Math formulas", term: "Percent change", definition: "(new − original) / original × 100%" },
  { id: "m-distance", topic: "Math formulas", term: "Distance formula", definition: "d = √((x₂ − x₁)² + (y₂ − y₁)²)" },
  { id: "m-circle", topic: "Math formulas", term: "Circle equation", definition: "(x − h)² + (y − k)² = r²" },
  { id: "m-exponential", topic: "Math formulas", term: "Exponential growth", definition: "y = a(1 + r)ᵗ", example: "For decay, use 1 − r." },
  { id: "m-special", topic: "Math formulas", term: "Special right triangles", definition: "45-45-90: x, x, x√2. 30-60-90: x, x√3, 2x." },

  // Test Strategy
  { id: "s-evidence", topic: "Test strategy", term: "Prove every answer", definition: "Choose the option directly supported by the text or math, not the one that merely sounds reasonable." },
  { id: "s-eliminate", topic: "Test strategy", term: "Eliminate precisely", definition: "Name the specific flaw in each rejected choice: unsupported, too broad, reversed, or irrelevant." },
  { id: "s-time", topic: "Test strategy", term: "Protect your time", definition: "Mark a slow question, make your best choice, and return after securing easier points." },
  { id: "s-desmos", topic: "Test strategy", term: "Use Desmos deliberately", definition: "Graph equations, find intersections, and build regressions when that is faster than symbolic work." },
  { id: "s-context", topic: "Test strategy", term: "Words in context", definition: "Cover the target word, predict a simple replacement, then compare the choices." },
  { id: "s-reread", topic: "Test strategy", term: "Reread the task", definition: "Before submitting, verify whether the question asks for a value, expression, inference, or supporting choice." },

  // Module Tracks
  { id: "tr-m-1-1", topic: "Math Module 1", term: "Linear equations", definition: "Review the basics of forming and solving y = mx + b equations." },
  { id: "tr-m-1-2", topic: "Math Module 1", term: "Systems of equations", definition: "Practice solving for two variables using substitution or elimination." },
  { id: "tr-m-1-3", topic: "Math Module 1", term: "Data analysis", definition: "Focus on reading graphs, charts, and basic statistics (mean, median, mode)." },
  { id: "tr-m-2-1", topic: "Math Module 2", term: "Advanced quadratics", definition: "Master the quadratic formula, vertex form, and interpreting parabolas." },
  { id: "tr-m-2-2", topic: "Math Module 2", term: "Trigonometry", definition: "Review SOH CAH TOA, special right triangles, and radian measure." },
  { id: "tr-m-2-3", topic: "Math Module 2", term: "Complex polynomials", definition: "Focus on dividing polynomials, remainder theorem, and analyzing higher degree functions." },
  
  { id: "tr-rw-1-1", topic: "Reading & Writing Module 1", term: "Words in context", definition: "Practice choosing the best word to fit a sentence based on the surrounding clues." },
  { id: "tr-rw-1-2", topic: "Reading & Writing Module 1", term: "Command of Evidence", definition: "Identify textual evidence that supports a given claim." },
  { id: "tr-rw-1-3", topic: "Reading & Writing Module 1", term: "Standard English Conventions", definition: "Focus on sentence boundaries, punctuation, and subject-verb agreement." },
  { id: "tr-rw-2-1", topic: "Reading & Writing Module 2", term: "Advanced inferencing", definition: "Practice drawing logical conclusions from complex texts, including poetry or historical documents." },
  { id: "tr-rw-2-2", topic: "Reading & Writing Module 2", term: "Cross-text connections", definition: "Synthesize information from two related passages." },
  { id: "tr-rw-2-3", topic: "Reading & Writing Module 2", term: "Expression of Ideas", definition: "Master transition words and logical sequence within a paragraph." },
];
