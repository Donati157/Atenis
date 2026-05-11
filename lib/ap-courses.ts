// Lista completa de cursos AP do College Board organizados por categoria.
// Cada curso aponta pra uma rubrica AP — usando as específicas quando existem
// (eng-lang, eng-lit, history-saq/leq/dbq) e a genérica `generic-ap` nos outros.

export type APCourseCategory =
  | "arts"
  | "english"
  | "history_social"
  | "math_cs"
  | "sciences"
  | "languages"

export interface APCourse {
  id: string
  title: string
  shortTitle: string
  category: APCourseCategory
  rubricId: string // default rubric id
  hasHistorySubtypes?: boolean // true → mostra picker SAQ/LEQ/DBQ
  notes?: string
}

export const AP_COURSE_CATEGORIES: Array<{
  id: APCourseCategory
  label: string
  emoji: string
  description: string
}> = [
  {
    id: "arts",
    label: "Artes",
    emoji: "🎓",
    description: "Portfólios visuais + análise de arte e música",
  },
  {
    id: "english",
    label: "Inglês",
    emoji: "📝",
    description: "Redação argumentativa + análise literária",
  },
  {
    id: "history_social",
    label: "História & Soc.",
    emoji: "🌍",
    description: "História, política, economia e psicologia",
  },
  {
    id: "math_cs",
    label: "Matemática & CS",
    emoji: "🧮",
    description: "Cálculo, estatística e computação",
  },
  {
    id: "sciences",
    label: "Ciências",
    emoji: "🔬",
    description: "Física, química, biologia e ambiental",
  },
  {
    id: "languages",
    label: "Línguas",
    emoji: "🌐",
    description: "Chinês, francês, alemão, italiano, japonês, latim, espanhol",
  },
]

export const AP_COURSES: APCourse[] = [
  // 🎓 Artes
  { id: "ap-2d-art", title: "AP 2-D Art and Design", shortTitle: "2-D Art and Design", category: "arts", rubricId: "generic-ap", notes: "Portfólio de sketch book + trabalhos selecionados" },
  { id: "ap-3d-art", title: "AP 3-D Art and Design", shortTitle: "3-D Art and Design", category: "arts", rubricId: "generic-ap", notes: "Portfólio 3D — escultura, instalação, design" },
  { id: "ap-drawing", title: "AP Drawing", shortTitle: "Drawing", category: "arts", rubricId: "generic-ap", notes: "Portfólio de desenho 2D" },
  { id: "ap-art-history", title: "AP Art History", shortTitle: "Art History", category: "arts", rubricId: "generic-ap", notes: "Análise de obras + contextualização histórica" },
  { id: "ap-music-theory", title: "AP Music Theory", shortTitle: "Music Theory", category: "arts", rubricId: "generic-ap", notes: "Leitura, escrita e análise musical" },

  // 📝 Inglês
  { id: "ap-eng-lang", title: "AP English Language and Composition", shortTitle: "English Language", category: "english", rubricId: "eng-lang" },
  { id: "ap-eng-lit", title: "AP English Literature and Composition", shortTitle: "English Literature", category: "english", rubricId: "eng-lit" },

  // 🌍 História & Ciências Sociais
  { id: "ap-comp-gov", title: "AP Comparative Government and Politics", shortTitle: "Comparative Gov", category: "history_social", rubricId: "generic-ap" },
  { id: "ap-euro-history", title: "AP European History", shortTitle: "European History", category: "history_social", rubricId: "history-leq", hasHistorySubtypes: true },
  { id: "ap-human-geo", title: "AP Human Geography", shortTitle: "Human Geography", category: "history_social", rubricId: "generic-ap" },
  { id: "ap-macro", title: "AP Macroeconomics", shortTitle: "Macroeconomics", category: "history_social", rubricId: "generic-ap" },
  { id: "ap-micro", title: "AP Microeconomics", shortTitle: "Microeconomics", category: "history_social", rubricId: "generic-ap" },
  { id: "ap-psych", title: "AP Psychology", shortTitle: "Psychology", category: "history_social", rubricId: "generic-ap" },
  { id: "ap-us-gov", title: "AP United States Government and Politics", shortTitle: "US Government", category: "history_social", rubricId: "generic-ap" },
  { id: "ap-us-history", title: "AP United States History", shortTitle: "US History", category: "history_social", rubricId: "history-leq", hasHistorySubtypes: true },
  { id: "ap-world-history", title: "AP World History: Modern", shortTitle: "World History: Modern", category: "history_social", rubricId: "history-leq", hasHistorySubtypes: true },

  // 🧮 Matemática & Computação
  { id: "ap-calc-ab", title: "AP Calculus AB", shortTitle: "Calculus AB", category: "math_cs", rubricId: "generic-ap", notes: "FRQ de cálculo com múltiplas partes" },
  { id: "ap-calc-bc", title: "AP Calculus BC", shortTitle: "Calculus BC", category: "math_cs", rubricId: "generic-ap", notes: "Cálculo AB + séries, integrais avançadas" },
  { id: "ap-stats", title: "AP Statistics", shortTitle: "Statistics", category: "math_cs", rubricId: "generic-ap", notes: "Interpretação + justificativa estatística" },
  { id: "ap-csa", title: "AP Computer Science A", shortTitle: "Computer Science A", category: "math_cs", rubricId: "generic-ap", notes: "Java · classes, métodos, algoritmos" },
  { id: "ap-csp", title: "AP Computer Science Principles", shortTitle: "CS Principles", category: "math_cs", rubricId: "generic-ap", notes: "Impacto computacional + create performance task" },

  // 🔬 Ciências
  { id: "ap-bio", title: "AP Biology", shortTitle: "Biology", category: "sciences", rubricId: "generic-ap" },
  { id: "ap-chem", title: "AP Chemistry", shortTitle: "Chemistry", category: "sciences", rubricId: "generic-ap" },
  { id: "ap-env-sci", title: "AP Environmental Science", shortTitle: "Environmental Science", category: "sciences", rubricId: "generic-ap" },
  { id: "ap-phys-1", title: "AP Physics 1: Algebra-Based", shortTitle: "Physics 1", category: "sciences", rubricId: "generic-ap" },
  { id: "ap-phys-2", title: "AP Physics 2: Algebra-Based", shortTitle: "Physics 2", category: "sciences", rubricId: "generic-ap" },
  { id: "ap-phys-c-mech", title: "AP Physics C: Mechanics", shortTitle: "Physics C · Mechanics", category: "sciences", rubricId: "generic-ap" },
  { id: "ap-phys-c-em", title: "AP Physics C: Electricity and Magnetism", shortTitle: "Physics C · E&M", category: "sciences", rubricId: "generic-ap" },

  // 🌐 Línguas
  { id: "ap-chinese", title: "AP Chinese Language and Culture", shortTitle: "Chinese", category: "languages", rubricId: "generic-ap" },
  { id: "ap-french", title: "AP French Language and Culture", shortTitle: "French", category: "languages", rubricId: "generic-ap" },
  { id: "ap-german", title: "AP German Language and Culture", shortTitle: "German", category: "languages", rubricId: "generic-ap" },
  { id: "ap-italian", title: "AP Italian Language and Culture", shortTitle: "Italian", category: "languages", rubricId: "generic-ap" },
  { id: "ap-japanese", title: "AP Japanese Language and Culture", shortTitle: "Japanese", category: "languages", rubricId: "generic-ap" },
  { id: "ap-latin", title: "AP Latin", shortTitle: "Latin", category: "languages", rubricId: "generic-ap" },
  { id: "ap-spanish-lang", title: "AP Spanish Language and Culture", shortTitle: "Spanish Language", category: "languages", rubricId: "generic-ap" },
  { id: "ap-spanish-lit", title: "AP Spanish Literature and Culture", shortTitle: "Spanish Literature", category: "languages", rubricId: "generic-ap" },
]

export function getCourseById(id: string): APCourse | undefined {
  return AP_COURSES.find((c) => c.id === id)
}

export function getCoursesByCategory(cat: APCourseCategory): APCourse[] {
  return AP_COURSES.filter((c) => c.category === cat)
}
