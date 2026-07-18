export const SAT_DOMAINS = {
  "Reading & Writing": [
    "Information and Ideas",
    "Craft and Structure",
    "Expression of Ideas",
    "Standard English Conventions",
  ],
  Math: [
    "Algebra",
    "Advanced Math",
    "Problem-Solving and Data Analysis",
    "Geometry and Trigonometry",
  ],
} as const;

export const MATH_SUBSKILLS: Record<string, string[]> = {
  Algebra: [
    "Linear equations in one variable",
    "Linear functions",
    "Linear equations in two variables",
    "Systems of two linear equations in two variables",
    "Linear inequalities in one or two variables",
  ],
  "Advanced Math": [
    "Nonlinear functions",
    "Nonlinear equations in one variable and systems of equations in two variables",
    "Equivalent expressions",
  ],
  "Problem-Solving and Data Analysis": [
    "Ratios, rates, proportional relationships, and units",
    "Percentages",
    "One-variable data: distributions and measures of center and spread",
    "Two-variable data: models and scatterplots",
    "Probability and conditional probability",
    "Inference from sample statistics and margin of error",
    "Evaluating statistical claims: observational studies and experiments",
  ],
  "Geometry and Trigonometry": [
    "Area and volume",
    "Lines, angles, and triangles",
    "Right triangles and trigonometry",
    "Circles",
  ],
};

export const RW_SUBSKILLS: Record<string, string[]> = {
  "Information and Ideas": ["Central Ideas and Details", "Command of Evidence", "Inferences"],
  "Craft and Structure": ["Words in Context", "Text Structure and Purpose", "Cross-Text Connections"],
  "Expression of Ideas": ["Rhetorical Synthesis", "Transitions"],
  "Standard English Conventions": ["Boundaries", "Form, Structure, and Sense"],
};

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export function skillsForDomain(domain: string): string[] {
  if (domain === "Math") return [...SAT_DOMAINS.Math];
  if (domain === "Reading & Writing") return [...SAT_DOMAINS["Reading & Writing"]];
  return [];
}

export function subskillsFor(domain: string, skill: string): string[] {
  if (domain === "Math") return MATH_SUBSKILLS[skill] ?? [];
  if (domain === "Reading & Writing") return RW_SUBSKILLS[skill] ?? [];
  return [];
}
