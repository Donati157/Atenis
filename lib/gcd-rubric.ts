export interface CriteriaLevel {
  level: "exemplifies" | "meets" | "approaches" | "developing"
  description: string
}

export interface Criteria {
  id: string
  name: string
  namePt: string
  weight: number
  levels: CriteriaLevel[]
}

export const rubricCriteria: Criteria[] = [
  {
    id: "reflection",
    name: "Reflection and Insight",
    namePt: "Reflexão e Insight",
    weight: 20,
    levels: [
      {
        level: "exemplifies",
        description:
          "Demonstrates deep insight, self-awareness, and critical thinking; reflections are personal, honest, and nuanced.",
      },
      {
        level: "meets",
        description:
          "Demonstrates clear reflection and personal understanding with relevant insight.",
      },
      {
        level: "approaches",
        description:
          "Some reflection present but lacks depth or is too general/superficial.",
      },
      {
        level: "developing",
        description: "Minimal or no reflection; mostly descriptive or impersonal.",
      },
    ],
  },
  {
    id: "structure",
    name: "Structure and Organization",
    namePt: "Estrutura e Organização",
    weight: 20,
    levels: [
      {
        level: "exemplifies",
        description:
          "The essay is logically organized with strong paragraph structure, clear flow, and effective transitions.",
      },
      {
        level: "meets",
        description:
          "Organization is generally clear; paragraphs follow a logical structure.",
      },
      {
        level: "approaches",
        description:
          "The essay has a basic structure, but some ideas may feel disorganized or unfocused.",
      },
      {
        level: "developing",
        description:
          "Lacks clear structure; paragraphs are unclear or disconnected.",
      },
    ],
  },
  {
    id: "language",
    name: "Language and Style",
    namePt: "Linguagem e Estilo",
    weight: 20,
    levels: [
      {
        level: "exemplifies",
        description:
          "Uses precise, expressive, and varied language; tone matches purpose; grammar is nearly flawless.",
      },
      {
        level: "meets",
        description:
          "Language is clear and appropriate; few errors that don't distract from meaning.",
      },
      {
        level: "approaches",
        description:
          "Language is sometimes unclear or repetitive, with noticeable errors in grammar.",
      },
      {
        level: "developing",
        description:
          "Frequent language issues; grammar and vocabulary interfere with meaning.",
      },
    ],
  },
  {
    id: "gcd-relevance",
    name: "Relevance to GCD Element",
    namePt: "Relevância ao Elemento GCD",
    weight: 20,
    levels: [
      {
        level: "exemplifies",
        description:
          "Fully addresses and explores the chosen GCD element with depth and a strong personal connection.",
      },
      {
        level: "meets",
        description:
          "Clearly relates experience to the GCD element with relevant examples.",
      },
      {
        level: "approaches",
        description:
          "Connection to GCD element is present but underdeveloped or vague.",
      },
      {
        level: "developing",
        description: "Little or no connection to GCD element; focus is unclear.",
      },
    ],
  },
  {
    id: "evidence",
    name: "Evidence",
    namePt: "Evidências",
    weight: 40,
    levels: [
      {
        level: "exemplifies",
        description:
          "The evidence is a clear testimonial of the experience and its outcomes.",
      },
      {
        level: "meets",
        description:
          "The evidence is a sufficient source for confirming the facts presented.",
      },
      {
        level: "approaches",
        description:
          "The evidence is poor, with no clear connection to the experience.",
      },
      {
        level: "developing",
        description:
          "There is no evidence, or the evidence does not connect to the experience.",
      },
    ],
  },
]

export const gcdElements = [
  "Academics",
  "Advanced Academics",
  "Academic Skills",
  "Intercultural Communication",
  "Multilingualism",
  "Global Understanding",
  "Community Engagement",
  "Leadership",
  "Work Experience",
  "Public Communication",
  "Personal Goal",
  "Personal Accomplishment",
  "Wellness",
  "Wilderness Engagement",
  "Artistic Expression",
  "Paraprofessional Accomplishment",
]

export function getLevelScore(level: CriteriaLevel["level"]): number {
  switch (level) {
    case "exemplifies":
      return 100
    case "meets":
      return 75
    case "approaches":
      return 50
    case "developing":
      return 25
  }
}

export function getLevelLabel(level: CriteriaLevel["level"]): string {
  switch (level) {
    case "exemplifies":
      return "Exemplifica"
    case "meets":
      return "Atende"
    case "approaches":
      return "Aproxima-se"
    case "developing":
      return "Em Desenvolvimento"
  }
}

export function getLevelColor(level: CriteriaLevel["level"]): string {
  switch (level) {
    case "exemplifies":
      return "text-green-400"
    case "meets":
      return "text-blue-400"
    case "approaches":
      return "text-yellow-400"
    case "developing":
      return "text-red-400"
  }
}

export function getLevelBgColor(level: CriteriaLevel["level"]): string {
  switch (level) {
    case "exemplifies":
      return "bg-green-500/20 border-green-500/30"
    case "meets":
      return "bg-blue-500/20 border-blue-500/30"
    case "approaches":
      return "bg-yellow-500/20 border-yellow-500/30"
    case "developing":
      return "bg-red-500/20 border-red-500/30"
  }
}
