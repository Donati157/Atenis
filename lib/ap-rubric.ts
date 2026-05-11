// AP College Board rubric presets. Score is point-based (not level-based).
// Each criterion has `maxPoints` and `descriptors` that describe each
// possible point value (0..max).

export interface APDescriptor {
  points: number
  description: string
  descriptionPt: string
}

export interface APCriterion {
  id: string
  name: string
  namePt: string
  maxPoints: number
  descriptors: APDescriptor[]
}

export type APCategory = "english" | "history" | "generic"

export interface APRubric {
  id: string
  name: string
  namePt: string
  subject: string
  category: APCategory
  totalPoints: number
  wordRange?: { min: number; max: number }
  notes?: string
  notesPt?: string
  criteria: APCriterion[]
}

export const AP_CATEGORIES: { id: APCategory; label: string }[] = [
  { id: "english", label: "Inglês" },
  { id: "history", label: "História" },
]

const ENG_THESIS: APCriterion = {
  id: "thesis",
  name: "Row A — Thesis / Claim",
  namePt: "Linha A — Tese / Argumento",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description: "Does not present a defensible thesis that responds to the prompt.",
      descriptionPt:
        "Não apresenta uma tese defensável que responda ao prompt.",
    },
    {
      points: 1,
      description:
        "Responds to the prompt with a defensible thesis that establishes a line of reasoning.",
      descriptionPt:
        "Responde ao prompt com uma tese defensável que estabelece uma linha de raciocínio.",
    },
  ],
}

const ENG_EVIDENCE_COMMENTARY: APCriterion = {
  id: "evidence-commentary",
  name: "Row B — Evidence and Commentary",
  namePt: "Linha B — Evidências e Comentário",
  maxPoints: 4,
  descriptors: [
    {
      points: 0,
      description:
        "Simply restates the thesis; provides no specific evidence or evidence that does not support any defensible claim.",
      descriptionPt:
        "Apenas reformula a tese; não fornece evidências específicas ou usa evidências que não sustentam nenhum argumento defensável.",
    },
    {
      points: 1,
      description:
        "Mostly general evidence; little or no commentary; may be mostly summary.",
      descriptionPt:
        "Evidências majoritariamente gerais; pouco ou nenhum comentário; pode ser majoritariamente resumo.",
    },
    {
      points: 2,
      description:
        "Some specific evidence, but commentary is mostly summary or does not explain the relationship between evidence and thesis.",
      descriptionPt:
        "Algumas evidências específicas, mas o comentário é majoritariamente resumo ou não explica a relação entre evidências e tese.",
    },
    {
      points: 3,
      description:
        "Specific evidence that supports claims in the response, with commentary that explains how the evidence supports the line of reasoning.",
      descriptionPt:
        "Evidências específicas que sustentam os argumentos, com comentário que explica como as evidências apoiam a linha de raciocínio.",
    },
    {
      points: 4,
      description:
        "Provides specific evidence to support all claims; commentary consistently explains the relationship between evidence and student's thesis/claim.",
      descriptionPt:
        "Fornece evidências específicas para sustentar todos os argumentos; comentário explica consistentemente a relação entre evidências e a tese/argumento do aluno.",
    },
  ],
}

const ENG_SOPHISTICATION: APCriterion = {
  id: "sophistication",
  name: "Row C — Sophistication",
  namePt: "Linha C — Sofisticação",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description: "Does not meet the criteria for one point.",
      descriptionPt: "Não atende aos critérios para receber o ponto.",
    },
    {
      points: 1,
      description:
        "Demonstrates sophistication of thought and/or a complex understanding of the rhetorical situation through vivid or persuasive style, nuanced reasoning, or exploration of alternative perspectives.",
      descriptionPt:
        "Demonstra sofisticação no pensamento e/ou compreensão complexa da situação retórica por meio de estilo vívido/persuasivo, raciocínio matizado ou exploração de perspectivas alternativas.",
    },
  ],
}

const APENG_LANG_CRITERIA: APCriterion[] = [ENG_THESIS, ENG_EVIDENCE_COMMENTARY, ENG_SOPHISTICATION]

const HIST_THESIS: APCriterion = {
  id: "thesis",
  name: "Thesis / Claim",
  namePt: "Tese / Argumento",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description: "Does not present a historically defensible thesis or claim.",
      descriptionPt: "Não apresenta uma tese defensável historicamente.",
    },
    {
      points: 1,
      description:
        "Responds with a historically defensible thesis/claim that establishes a line of reasoning.",
      descriptionPt:
        "Responde com uma tese historicamente defensável que estabelece uma linha de raciocínio.",
    },
  ],
}

const HIST_CONTEXT: APCriterion = {
  id: "contextualization",
  name: "Contextualization",
  namePt: "Contextualização",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description: "Does not describe broader historical context relevant to the prompt.",
      descriptionPt:
        "Não descreve o contexto histórico mais amplo relevante ao prompt.",
    },
    {
      points: 1,
      description:
        "Describes broader historical context relevant to the prompt — events/developments before, during, or continuing after.",
      descriptionPt:
        "Descreve contexto histórico mais amplo relevante ao prompt — eventos ou desenvolvimentos antes, durante ou depois.",
    },
  ],
}

const DBQ_EVIDENCE: APCriterion = {
  id: "evidence-docs",
  name: "Evidence — Documents",
  namePt: "Evidências — Documentos",
  maxPoints: 2,
  descriptors: [
    {
      points: 0,
      description: "Does not describe the content of any documents.",
      descriptionPt: "Não descreve o conteúdo de nenhum documento.",
    },
    {
      points: 1,
      description: "Accurately describes the content of at least three documents.",
      descriptionPt: "Descreve com precisão o conteúdo de ao menos três documentos.",
    },
    {
      points: 2,
      description:
        "Supports an argument in response to the prompt using at least four documents.",
      descriptionPt:
        "Sustenta um argumento em resposta ao prompt usando ao menos quatro documentos.",
    },
  ],
}

const DBQ_BEYOND: APCriterion = {
  id: "evidence-beyond",
  name: "Evidence — Beyond the Documents",
  namePt: "Evidências — Além dos Documentos",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description: "Does not provide evidence beyond the documents.",
      descriptionPt: "Não fornece evidências além dos documentos.",
    },
    {
      points: 1,
      description:
        "Uses at least one specific piece of historical evidence beyond those in the documents, relevant to the argument.",
      descriptionPt:
        "Usa ao menos uma evidência histórica específica além dos documentos, relevante ao argumento.",
    },
  ],
}

const DBQ_SOURCING: APCriterion = {
  id: "sourcing",
  name: "Analysis — Sourcing",
  namePt: "Análise — Fontes (Sourcing)",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description: "Does not explain sourcing for any documents.",
      descriptionPt: "Não explica a origem (sourcing) de nenhum documento.",
    },
    {
      points: 1,
      description:
        "For at least two documents, explains how or why the document's point of view, purpose, historical situation, and/or audience is relevant to an argument (2024 College Board rubric).",
      descriptionPt:
        "Para ao menos dois documentos, explica como ou por que o ponto de vista, propósito, situação histórica e/ou público-alvo do documento é relevante a um argumento (rubrica oficial 2024).",
    },
  ],
}

const DBQ_COMPLEXITY: APCriterion = {
  id: "complexity",
  name: "Analysis — Complex Understanding",
  namePt: "Análise — Compreensão Complexa",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description: "Does not demonstrate complex understanding.",
      descriptionPt: "Não demonstra compreensão complexa.",
    },
    {
      points: 1,
      description:
        "Demonstrates complex understanding through sophisticated argumentation and/or effective use of evidence. Options include: multiple themes/perspectives; multiple causes/effects; both cause AND effect; insightful connections across periods/regions; using 7 documents effectively; explaining POV/purpose/HS/audience for 4+ documents.",
      descriptionPt:
        "Demonstra compreensão complexa via argumentação sofisticada e/ou uso eficaz de evidências. Opções: múltiplos temas/perspectivas; múltiplas causas/efeitos; causa E efeito; conexões entre períodos/regiões; uso efetivo dos 7 documentos; explicação de POV/propósito/SH/audiência para 4+ documentos.",
    },
  ],
}

const SAQ_PART_A: APCriterion = {
  id: "part_a",
  name: "Part A",
  namePt: "Parte A",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description:
        "Does not correctly identify/describe/explain what the prompt asks for in part A.",
      descriptionPt:
        "Não identifica/descreve/explica corretamente o que a parte A pede.",
    },
    {
      points: 1,
      description:
        "Successfully identifies, describes, or explains the required element for part A, grounded in the stimulus (if any) or historically defensible knowledge.",
      descriptionPt:
        "Identifica, descreve ou explica corretamente o elemento pedido na parte A, apoiado no estímulo (se houver) ou em conhecimento histórico defensável.",
    },
  ],
}

const SAQ_PART_B: APCriterion = {
  id: "part_b",
  name: "Part B",
  namePt: "Parte B",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description: "Does not correctly identify/describe/explain what the prompt asks for in part B.",
      descriptionPt: "Não identifica/descreve/explica corretamente o que a parte B pede.",
    },
    {
      points: 1,
      description:
        "Successfully identifies, describes, or explains the required element for part B. For 'Explain' prompts, must provide how/why — not just restate.",
      descriptionPt:
        "Identifica, descreve ou explica corretamente o elemento pedido na parte B. Para prompts com 'Explain', é preciso dizer como/por que — não só repetir o enunciado.",
    },
  ],
}

const SAQ_PART_C: APCriterion = {
  id: "part_c",
  name: "Part C",
  namePt: "Parte C",
  maxPoints: 1,
  descriptors: [
    {
      points: 0,
      description: "Does not correctly identify/describe/explain what the prompt asks for in part C.",
      descriptionPt: "Não identifica/descreve/explica corretamente o que a parte C pede.",
    },
    {
      points: 1,
      description:
        "Successfully identifies, describes, or explains the required element for part C. Connections to broader historical context earn this point.",
      descriptionPt:
        "Identifica, descreve ou explica corretamente o elemento pedido na parte C. Conexões com contexto histórico mais amplo ganham o ponto.",
    },
  ],
}

const LEQ_EVIDENCE: APCriterion = {
  id: "evidence",
  name: "Evidence",
  namePt: "Evidências",
  maxPoints: 2,
  descriptors: [
    {
      points: 0,
      description: "Does not provide specific examples of evidence relevant to the topic.",
      descriptionPt: "Não fornece exemplos específicos de evidência relevantes ao tópico.",
    },
    {
      points: 1,
      description: "Provides specific examples of evidence relevant to the topic.",
      descriptionPt: "Fornece exemplos específicos de evidências relevantes ao tópico.",
    },
    {
      points: 2,
      description: "Supports an argument in response to the prompt using specific and relevant evidence.",
      descriptionPt:
        "Sustenta um argumento em resposta ao prompt usando evidências específicas e relevantes.",
    },
  ],
}

const LEQ_ANALYSIS: APCriterion = {
  id: "analysis",
  name: "Analysis and Reasoning",
  namePt: "Análise e Raciocínio",
  maxPoints: 2,
  descriptors: [
    {
      points: 0,
      description: "Does not use historical reasoning skills appropriately.",
      descriptionPt: "Não usa habilidades de raciocínio histórico de forma apropriada.",
    },
    {
      points: 1,
      description:
        "Uses a historical reasoning skill (comparison, causation, or CCOT) to frame or structure the argument.",
      descriptionPt:
        "Usa uma habilidade de raciocínio histórico (comparação, causação ou CCOT) para estruturar o argumento.",
    },
    {
      points: 2,
      description:
        "Demonstrates complex understanding of historical development through sophisticated argumentation and/or use of evidence.",
      descriptionPt:
        "Demonstra compreensão complexa do desenvolvimento histórico por meio de argumentação sofisticada e/ou uso de evidências.",
    },
  ],
}

export const apRubrics: APRubric[] = [
  {
    id: "eng-lang",
    name: "AP English Language — FRQ",
    namePt: "AP English Language — FRQ",
    subject: "AP English Language and Composition",
    category: "english",
    totalPoints: 6,
    wordRange: { min: 500, max: 1200 },
    notes:
      "Same rubric applies to the 3 FRQ types: Rhetorical Analysis, Argument, Synthesis. Indicate the specific task in the prompt.",
    notesPt:
      "Mesma rubrica para os 3 tipos de FRQ: Análise Retórica, Argumento e Síntese. Indique o tipo específico no prompt.",
    criteria: APENG_LANG_CRITERIA,
  },
  {
    id: "eng-lit",
    name: "AP English Literature — FRQ",
    namePt: "AP English Literature — FRQ",
    subject: "AP English Literature and Composition",
    category: "english",
    totalPoints: 6,
    notes:
      "Same rubric applies to the 3 FRQ types: Poetry Analysis, Prose Fiction Analysis, Literary Argument. Indicate the specific task in the prompt.",
    notesPt:
      "Mesma rubrica para os 3 tipos de FRQ: Análise de Poesia, Análise de Prosa e Argumento Literário. Indique o tipo específico no prompt.",
    criteria: APENG_LANG_CRITERIA,
  },
  {
    id: "generic-ap",
    name: "AP Generic Rubric",
    namePt: "Rubrica AP genérica",
    subject: "Qualquer AP (quando não tem rubrica específica)",
    category: "generic",
    totalPoints: 6,
    notes:
      "Generic 6-point rubric applicable to most AP subjects without a specific rubric (Sciences, Math, CS, Languages, Arts, Social Sciences). The AI will adapt feedback to the specific course.",
    notesPt:
      "Rubrica genérica de 6 pontos aplicável à maioria dos AP (Ciências, Matemática, CS, Línguas, Artes, Ciências Sociais). A IA adapta o feedback ao curso específico.",
    criteria: [
      {
        id: "claim",
        name: "Claim / Thesis / Main Answer",
        namePt: "Argumento / Tese / Resposta principal",
        maxPoints: 1,
        descriptors: [
          {
            points: 0,
            description: "No defensible claim, main idea, or correct answer.",
            descriptionPt: "Não apresenta argumento defensável, ideia principal ou resposta correta.",
          },
          {
            points: 1,
            description: "States a clear, defensible claim or correct answer that addresses the prompt.",
            descriptionPt: "Apresenta argumento claro/defensável ou resposta correta que responde ao prompt.",
          },
        ],
      },
      {
        id: "evidence",
        name: "Evidence / Support / Data",
        namePt: "Evidências / Suporte / Dados",
        maxPoints: 2,
        descriptors: [
          {
            points: 0,
            description: "Provides no specific evidence or data supporting the claim.",
            descriptionPt: "Não fornece evidências ou dados específicos.",
          },
          {
            points: 1,
            description: "Provides some specific evidence/data but incomplete or not fully relevant.",
            descriptionPt: "Fornece alguma evidência/dados específicos, mas incompletos ou pouco relevantes.",
          },
          {
            points: 2,
            description: "Provides specific, accurate, and relevant evidence/data supporting the claim.",
            descriptionPt: "Fornece evidências/dados específicos, precisos e relevantes que sustentam o argumento.",
          },
        ],
      },
      {
        id: "reasoning",
        name: "Analysis / Reasoning / Method",
        namePt: "Análise / Raciocínio / Método",
        maxPoints: 2,
        descriptors: [
          {
            points: 0,
            description: "No analysis or reasoning connecting evidence to claim.",
            descriptionPt: "Sem análise ou raciocínio conectando evidências ao argumento.",
          },
          {
            points: 1,
            description: "Some reasoning present but incomplete or with errors.",
            descriptionPt: "Algum raciocínio presente, mas incompleto ou com erros.",
          },
          {
            points: 2,
            description: "Clear, complete analysis/reasoning with correct method that explains how evidence supports the claim.",
            descriptionPt: "Análise/raciocínio claro e completo, com método correto, explicando como as evidências sustentam o argumento.",
          },
        ],
      },
      {
        id: "communication",
        name: "Communication / Sophistication",
        namePt: "Comunicação / Sofisticação",
        maxPoints: 1,
        descriptors: [
          {
            points: 0,
            description: "Response lacks clarity, has major errors, or fails to communicate reasoning effectively.",
            descriptionPt: "Resposta sem clareza, com erros graves ou falha em comunicar o raciocínio.",
          },
          {
            points: 1,
            description: "Clearly written, well-organized, uses correct terminology/notation for the subject.",
            descriptionPt: "Escrita clara, bem organizada, usa terminologia/notação correta da disciplina.",
          },
        ],
      },
    ],
  },
  {
    id: "history-saq",
    name: "AP History — Short Answer Question (SAQ)",
    namePt: "AP History — SAQ (Short Answer Question)",
    subject: "AP US / World / Euro History",
    category: "history",
    totalPoints: 3,
    notes:
      "3 independent parts (a, b, c). Each part uses 'Identify' or 'Explain' commands. Do NOT write a thesis — direct responses only.",
    notesPt:
      "3 partes independentes (a, b, c). Cada parte pede 'Identify' ou 'Explain'. Não escreva tese — respostas diretas.",
    criteria: [SAQ_PART_A, SAQ_PART_B, SAQ_PART_C],
  },
  {
    id: "history-leq",
    name: "AP History — Long Essay Question (LEQ)",
    namePt: "AP History — LEQ (Long Essay Question)",
    subject: "AP US / World / Euro History",
    category: "history",
    totalPoints: 6,
    notes: "Tests historical argumentation without documents.",
    notesPt: "Avalia argumentação histórica sem documentos.",
    criteria: [HIST_THESIS, HIST_CONTEXT, LEQ_EVIDENCE, LEQ_ANALYSIS],
  },
  {
    id: "history-dbq",
    name: "AP History — Document-Based Question (DBQ)",
    namePt: "AP History — DBQ (Document-Based Question)",
    subject: "AP US / World / Euro History",
    category: "history",
    totalPoints: 7,
    notes: "Response should use 6 of the 7 provided documents and go beyond them.",
    notesPt: "A resposta deve usar 6 dos 7 documentos fornecidos e ir além deles.",
    criteria: [HIST_THESIS, HIST_CONTEXT, DBQ_EVIDENCE, DBQ_BEYOND, DBQ_SOURCING, DBQ_COMPLEXITY],
  },
]

export function getRubricsByCategory(): Record<APCategory, APRubric[]> {
  const out: Record<APCategory, APRubric[]> = { english: [], history: [], generic: [] }
  for (const r of apRubrics) out[r.category].push(r)
  return out
}

// Strips redundant category prefixes so the label is shorter when already
// displayed under a grouped header (e.g. "Inglês" / "História").
export function shortRubricLabel(namePt: string, category: APCategory): string {
  if (category === "english") return namePt.replace(/^AP /, "")
  if (category === "history") return namePt.replace(/^AP History — /, "")
  if (category === "generic") return namePt
  return namePt
}

// Prompts de exemplo retirados das FRQ oficiais AP World History: Modern 2024 Set 1.
// Podem ser carregados no form pra o aluno praticar com questões reais.
export const samplePrompts: Record<string, { title: string; prompt: string }[]> = {
  "history-saq": [
    {
      title: "SAQ 1 — Mughals, Hindus e Muçulmanos (2024)",
      prompt: `"Under the Mughals, Hindus and Muslims interacted in economics, politics, social life, the arts, and culture. Through migration and conversion, the Muslim population of India grew from about 400,000 in 1200 to 50 million by 1800. Muslim scholars and Sufi mystics migrated from Iran, Turkey, and Central Asia... On the level of mystical belief, an astonishing syncretism emerged between Hindus and Muslims, especially in the poetry of Kabir (d. c.1520) and of Guru Nanak (1469–1538), the originator of the Sikh religion."
— Howard Spodek and Michele Langford Louro, scholarly article, 2007.

Using the excerpt, respond to parts a, b, and c.
a. Identify ONE claim that the authors make in the first paragraph.
b. Identify ONE piece of evidence the authors use to support their claims about cultural interactions in the second paragraph.
c. Explain ONE reason why Mughal rulers in the period c. 1450–1750 would have encouraged the interactions described in the passage.`,
    },
    {
      title: "SAQ 2 — Poster nazista 1932 (2024)",
      prompt: `Imagem: Election Poster for the German National Socialist Party, 1932. O texto em alemão diz: "Homens! Mulheres! Milhões de homens sem trabalho; milhões de crianças sem futuro. Salvem a família alemã — votem em Adolf Hitler."

Using the image, respond to parts a, b, and c.
a. Identify ONE likely political purpose of the image.
b. Explain ONE way the image illustrates the economic situation of the period after the First World War.
c. Explain ONE way the rise of the German National Socialist Party led to the Second World War.`,
    },
    {
      title: "SAQ 3 — Colonialismo europeu nas Américas (2024)",
      prompt: `Respond to parts a, b, and c.
a. Identify ONE method Europeans used to expand their empires in the Americas in the period c. 1450–1750.
b. Explain ONE way European colonialism affected Indigenous peoples in the Americas in the period c. 1450–1750.
c. Explain ONE way European interactions with non-European peoples in the Americas contributed to the development of a global economy in the period c. 1450–1750.`,
    },
    {
      title: "SAQ 4 — Imperialismo ocidental na Ásia (2024)",
      prompt: `Respond to parts a, b, and c.
a. Identify ONE way Asians resisted Western imperialism in the period c. 1800–1914.
b. Explain ONE way European imperialism changed the cultures of peoples in Asia in the period c. 1800–1914.
c. Explain ONE way European imperialism in Asia contributed to changes in the global economy in the period c. 1800–1914.`,
    },
  ],
  "history-dbq": [
    {
      title: "DBQ — Comunismo e sociedades soviética/chinesa (2024)",
      prompt: `Evaluate the extent to which communist rule transformed Soviet and/or Chinese societies in the period circa 1930–1990.

Your response should:
- Respond with a historically defensible thesis/claim that establishes a line of reasoning.
- Describe a broader historical context relevant to the prompt.
- Support an argument using at least four of the seven provided documents (describe/use content of 3 docs for 1 pt; use 4+ to support argument for 2 pts).
- Use at least one specific piece of evidence BEYOND the documents.
- For at least two documents, explain how/why the document's POV, purpose, historical situation, or audience is relevant to an argument.
- Demonstrate a complex understanding (multiple perspectives, causation, connections across periods, or effective use of 7 docs).

(Obs.: cole aqui também os 7 documentos fornecidos, se os tiver.)`,
    },
  ],
  "history-leq": [
    {
      title: "LEQ — Redes de troca e mudança em Afro-Eurásia (2024)",
      prompt: `In the period circa 1200–1750 networks of exchange led to the spread of religions, cultures, ideas, and traditions in many parts of Afro-Eurasia.

Develop an argument that evaluates the extent to which exchange networks contributed to social or cultural change in Afro-Eurasia during this period.

Your response should:
- Respond with a historically defensible thesis/claim that establishes a line of reasoning.
- Describe a broader historical context relevant to the prompt.
- Provide at least TWO specific pieces of evidence; use them to support an argument for the full 2 pts.
- Use a historical reasoning skill (comparison, causation, or continuity and change over time — CCOT) to frame the argument.
- Demonstrate complex understanding for the top point (e.g., multiple themes, insightful connections across regions).`,
    },
  ],
  "eng-lang": [
    {
      title: "Rhetorical Analysis (template)",
      prompt: `(Substitua pelo prompt real da sua prova.)

Read the following passage carefully. Then, in a well-written essay, analyze the rhetorical choices the author makes to convey his/her message about [TOPIC]. In your response:

- Respond with a defensible thesis that analyzes the writer's rhetorical choices.
- Select and use evidence to support your line of reasoning.
- Explain how the evidence supports your line of reasoning.
- Demonstrate an understanding of the rhetorical situation.
- Use appropriate grammar and punctuation.`,
    },
    {
      title: "Argument (template)",
      prompt: `(Substitua pelo prompt real.)

Carefully read the following passage. Then write an essay in which you develop a position on [TOPIC]. Use appropriate, specific evidence to illustrate and develop your position.

Your response should:
- Respond with a defensible thesis/claim.
- Provide evidence to support your line of reasoning.
- Explain how the evidence supports your line of reasoning.
- Demonstrate sophistication of thought (nuance, multiple perspectives, or vivid style) for the sophistication point.`,
    },
    {
      title: "Synthesis (template)",
      prompt: `(Substitua pelo prompt real com as fontes.)

The following prompt is based on the accompanying sources. Carefully read the sources. Then synthesize material from at least three of the sources and incorporate it into a coherent, well-developed essay that argues your position on [TOPIC].

Refer to the sources by their letters (Source A, Source B, etc.) OR descriptions in parentheses. Your response should synthesize material from at least 3 sources AND develop and support your argument.`,
    },
  ],
  "eng-lit": [
    {
      title: "Poetry Analysis (template)",
      prompt: `(Substitua pelo prompt real com o poema.)

Read the following poem carefully. Then, in a well-written essay, analyze how the poet uses literary elements and techniques (such as imagery, tone, structure, figurative language) to convey the speaker's complex perspective on [TOPIC].`,
    },
    {
      title: "Prose Fiction Analysis (template)",
      prompt: `(Substitua pelo prompt real com o trecho.)

Read the following passage carefully. Then, in a well-written essay, analyze how the author uses literary techniques (such as characterization, narrative perspective, dialogue, setting) to convey the passage's meaning and [NARRATIVE EFFECT].`,
    },
    {
      title: "Literary Argument (template)",
      prompt: `(Substitua pelo prompt real e pelo livro escolhido.)

Select a work of fiction in which a character experiences [THEME/CONCEPT]. Then, in a well-constructed essay, analyze how this experience illuminates the meaning of the work as a whole. Do not merely summarize the plot.`,
    },
  ],
}

export function getRubricById(id: string): APRubric | undefined {
  return apRubrics.find((r) => r.id === id)
}

export function scorePercent(score: number, max: number): number {
  if (max <= 0) return 0
  return Math.round((score / max) * 100)
}

export function getScoreColor(score: number, max: number): string {
  const pct = scorePercent(score, max)
  if (pct >= 85) return "text-green-400"
  if (pct >= 65) return "text-blue-400"
  if (pct >= 40) return "text-yellow-400"
  return "text-red-400"
}

export function getScoreBgColor(score: number, max: number): string {
  const pct = scorePercent(score, max)
  if (pct >= 85) return "bg-green-500/20 border-green-500/30"
  if (pct >= 65) return "bg-blue-500/20 border-blue-500/30"
  if (pct >= 40) return "bg-yellow-500/20 border-yellow-500/30"
  return "bg-red-500/20 border-red-500/30"
}
