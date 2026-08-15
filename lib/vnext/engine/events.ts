// lib/vnext/engine/events.ts
//
// Eventos que o aluno emite pra o Runtime. Em produção real, esses
// eventos vêm indiretamente (análise da mensagem do aluno, botões de UI,
// avaliação do gateway em phases de correção). Na Fase 1, o consumer
// (teste/endpoint) passa o evento explicitamente pra determinismo total.

import type { TeachingStrategy } from "./strategies"

export type StudentEvent =
  | { kind: "start" }
  | { kind: "confused"; text?: string }
  | {
      kind: "answer"
      // Fase 1 usa boolean simples. Fase futura vai granular pra
      // "success | partial | failure" com evidência textual.
      correct: boolean
      strategyUsed: TeachingStrategy
      text?: string
    }
  | { kind: "self-report-ready" }

export function eventLabel(event: StudentEvent): string {
  switch (event.kind) {
    case "start":
      return "início"
    case "answer":
      return `resposta (${event.correct ? "correta" : "incorreta"}, ${event.strategyUsed})`
    case "confused":
      return "confuso"
    case "self-report-ready":
      return "autodeclaração pronto"
  }
}
