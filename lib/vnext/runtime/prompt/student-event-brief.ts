// lib/vnext/runtime/prompt/student-event-brief.ts
//
// Traduz `StudentEvent` do Runtime em instrução acionável ao modelo.
//
// Formato antigo do composer: `system: "student-event: {json cru}"`.
// Formato novo: header em prosa "EVENTO DO ALUNO NESTE TURNO" + descrição.
//
// MARCADOR ESTÁVEL: primeira linha começa com `## EVENTO DO ALUNO`.

import type { StudentEvent } from "../../engine/events"

export const EVENT_HEADER = "## EVENTO DO ALUNO NESTE TURNO"

export function buildStudentEventBrief(event: StudentEvent): string {
  return `${EVENT_HEADER}

${describe(event)}`
}

function describe(event: StudentEvent): string {
  switch (event.kind) {
    case "start":
      return `Tipo: **início** — este é o primeiro turno do aluno neste tópico. Sem tentativa prévia.`
    case "confused": {
      const t = event.text ? `\n\nTrecho da confusão: "${event.text}"` : ""
      return `Tipo: **confuso** — o aluno sinalizou que travou ou não entendeu. Não retome do zero; identifique especificamente onde a compreensão quebrou e apoie ali.${t}`
    }
    case "answer": {
      const t = event.text
        ? `\n\nTexto da tentativa (para você comentar o PROCESSO, não o gabarito):\n"${event.text}"`
        : ""
      const verdict = event.correct
        ? "O Evaluator classificou como CORRETA."
        : "O Evaluator classificou como INCORRETA."
      return `Tipo: **resposta** enviada pelo aluno usando a estratégia \`${event.strategyUsed}\`.
${verdict} Sua tarefa NÃO é reavaliar (esse é papel do Evaluator/Critic). Sua tarefa é COMENTAR o processo pedagógico: reconhecer o que ele acertou/tentou, apontar onde desviou, sugerir próximo passo.${t}`
    }
    case "self-report-ready":
      return `Tipo: **autodeclaração** — aluno diz estar pronto pra avançar. Você pode propor verificação (via Question do banco) antes de confirmar, ou aceitar e propor próximo tópico.`
  }
}
