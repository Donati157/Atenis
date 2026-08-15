// lib/vnext/engine/phases.ts
//
// Fases do Método Atenis.
//
// FASE 1.1: `review` removida. Justificativa: no design da Fase 1, review
// produzia useCase distinto ("atenis.review") mas comportamento
// indistinguível de teach — mesmo prompt, mesmo shape de resposta,
// nenhuma regra específica no engine. Ocupava slot no diagrama sem
// função pedagógica. Se um dia review real precisar existir (síntese
// interdisciplinar antes de verify, por exemplo), reintroduzir como
// fase generative com prompt e contrato próprios.
//
// Classificação:
//   - GENERATIVE: chama o Gateway pra produzir conteúdo pro aluno.
//     (diagnose, teach, practice, verify)
//   - INTERNAL: só atualiza state, não emite resposta pro aluno.
//     (evaluate, adapt)
//   - TERMINAL: fim de ciclo, Runtime não avança mais desse estado.
//     (ready, abort)

export const METHOD_PHASES = [
  "diagnose",
  "teach",
  "practice",
  "evaluate",
  "adapt",
  "verify",
  "ready",
  "abort",
] as const

export type MethodPhase = (typeof METHOD_PHASES)[number]

const GENERATIVE_PHASES: readonly MethodPhase[] = [
  "diagnose",
  "teach",
  "practice",
  "verify",
] as const

const INTERNAL_PHASES: readonly MethodPhase[] = ["evaluate", "adapt"] as const

const TERMINAL_PHASES: readonly MethodPhase[] = ["ready", "abort"] as const

const AWAITS_INPUT_PHASES: readonly MethodPhase[] = [
  "diagnose",
  "practice",
  "verify",
] as const

export function isGenerative(phase: MethodPhase): boolean {
  return GENERATIVE_PHASES.includes(phase)
}
export function isInternal(phase: MethodPhase): boolean {
  return INTERNAL_PHASES.includes(phase)
}
export function isTerminal(phase: MethodPhase): boolean {
  return TERMINAL_PHASES.includes(phase)
}
export function awaitsStudentInput(phase: MethodPhase): boolean {
  return AWAITS_INPUT_PHASES.includes(phase)
}

export const METHOD_PHASE_LABELS_PT: Record<MethodPhase, string> = {
  diagnose: "Diagnóstico",
  teach: "Ensino",
  practice: "Prática",
  evaluate: "Avaliação",
  adapt: "Adaptação",
  verify: "Verificação de prontidão",
  ready: "Pronto",
  abort: "Interrompido",
}
