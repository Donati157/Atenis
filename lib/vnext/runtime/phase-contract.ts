// lib/vnext/runtime/phase-contract.ts
//
// Fase 2B.7: enforcement do contrato de fase que o Runtime conhece mas
// que o `structuredResponseSchema` global NÃO codifica (decisão consciente
// da Fase 0.1 — arrays opcionais permitem `practice` legitimamente vazio).
//
// Responsabilidade DIVIDIDA:
//   - Critic (schema/critic.ts): analisa StructuredResponse isolada
//     contra as 8 regras epistêmicas fixas. NÃO conhece phase.
//   - Refiner (aqui): enforcement de contrato POR FASE, que o Runtime
//     conhece. NÃO é regra Critic nova — é validação de expectativa
//     pedagógica que muda por fase.
//
// Contrato atual (Fase 2B.6.4 — texto do phase-goal já cobra isso):
//   - `diagnose`: obrigatoriamente ≥1 claim (mesmo que hypothesis+tentative)
//   - `teach`:    obrigatoriamente ≥1 claim + ≥1 evidence
//   - `practice`: sem cardinalidade mínima (pode apresentar questão e parar)
//   - `verify`:   sem cardinalidade mínima aqui (Evaluator julga a resposta;
//                 análise do processo é opcional)
//
// Quando violado, retorna hint acionável pra alimentar refine loop —
// NÃO aborta. Modelo tem 2ª chance com feedback específico.

import type { MethodPhase } from "../engine/phases"
import type { StructuredResponse } from "../schema/epistemic"
import type { RefinementHint } from "../schema/critic"

export interface PhaseContractViolation {
  reason: string
  hint: RefinementHint
}

/**
 * Verifica se a `reply` satisfaz o contrato pedagógico da fase. Retorna
 * `null` quando OK, ou um `PhaseContractViolation` com hint pra refine.
 */
export function checkPhaseContract(
  phase: MethodPhase,
  reply: StructuredResponse,
): PhaseContractViolation | null {
  switch (phase) {
    case "diagnose":
      if (reply.claims.length === 0) {
        return {
          reason: "diagnose sem claim: contrato pedagógico exige ao menos 1 leitura hipotética",
          hint: {
            issueCode: "MISSING_DIAGNOSTIC_CLAIM",
            location: "claims",
            operation: "add-evidence",
            hint: "Fase diagnose exige ao menos 1 `claim` com sua leitura inicial do aluno. Sem base sólida? Use `type: \"hypothesis\"` + `assertionLevel: \"tentative\"` — a claim continua sendo produzida, apenas marcada como especulativa. Silêncio não é output válido em diagnose.",
            priority: "high",
          },
        }
      }
      return null

    case "teach":
      if (reply.claims.length === 0) {
        return {
          reason: "teach sem claim: contrato exige claims sobre o conceito ensinado",
          hint: {
            issueCode: "MISSING_TEACH_CLAIM",
            location: "claims",
            operation: "add-evidence",
            hint: "Fase teach exige ao menos 1 `claim` do tipo `definition` ou `fact` sobre o conceito, com Evidences apontando pra fontes reais.",
            priority: "high",
          },
        }
      }
      return null

    // practice/verify: sem cardinalidade mínima nesta fase.
    // evaluate/adapt/ready/abort: não são phases generativas, não passam por aqui.
    default:
      return null
  }
}
