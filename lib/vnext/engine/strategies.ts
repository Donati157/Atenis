// lib/vnext/engine/strategies.ts
//
// Estratégias pedagógicas. NÃO é "estilo de aprendizagem do aluno" —
// é técnica de ensino que o sistema aplica em um contexto (tópico +
// tentativas). A eficácia é rastreada em LearningTopicState.
// strategyEffectiveness — evidência de eficácia POR CONTEXTO, não como
// característica fixa do aluno.

export const TEACHING_STRATEGIES = [
  "worked_example", // apresenta exemplo resolvido passo a passo
  "analogy", // usa analogia com algo familiar
  "socratic", // pergunta guiada
  "first_principles", // deriva do zero
  "visual_diagram", // descreve/instrui diagrama visual
] as const

export type TeachingStrategy = (typeof TEACHING_STRATEGIES)[number]

// Ordem de fallback determinística. Quando adapt precisa escolher uma
// strategy nova, percorre nessa ordem e pega a primeira que não foi
// tentada ainda (ou que teve baixa eficácia, ver pickAdaptStrategy).
export const STRATEGY_FALLBACK_ORDER: readonly TeachingStrategy[] = [
  "worked_example",
  "analogy",
  "visual_diagram",
  "socratic",
  "first_principles",
]

export const STRATEGY_LABELS_PT: Record<TeachingStrategy, string> = {
  worked_example: "Exemplo resolvido",
  analogy: "Analogia",
  socratic: "Perguntas socráticas",
  first_principles: "Derivação do zero",
  visual_diagram: "Diagrama visual",
}
