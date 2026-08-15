// lib/vnext/runtime/prompt/refinement-brief.ts
//
// Traduz `RefinementHint[]` do Critic em instrução acionável ao modelo.
//
// Formato antigo do composer (Fase 1): `system: "critic-feedback: [json cru]"`.
// Formato novo: header em prosa "REFINAMENTO SOLICITADO" + bullet list.
//
// MARCADOR ESTÁVEL: a primeira linha da string SEMPRE começa com
// `## REFINAMENTO SOLICITADO`. Testes (e MockProvider matchers) usam esse
// marcador pra detectar "esta chamada é uma retentativa com feedback".

import type { RefinementHint } from "../../schema/critic"

export const REFINEMENT_HEADER = "## REFINAMENTO SOLICITADO"

export function buildRefinementBrief(hints: RefinementHint[]): string {
  if (hints.length === 0) return ""
  const bullets = hints
    .map((h) => {
      const priority = h.priority ? ` [${h.priority.toUpperCase()}]` : ""
      const loc = h.location ? ` em \`${h.location}\`` : ""
      const op = h.operation ? ` (operação sugerida: \`${h.operation}\`)` : ""
      return `- **${h.issueCode}**${priority}${loc}${op}
  ${h.hint}`
    })
    .join("\n")
  return `${REFINEMENT_HEADER}

O Critic revisou sua tentativa anterior nesta mesma pergunta e apontou os
problemas abaixo. Corrija ESPECIFICAMENTE esses pontos, mantenha o que já
estava bom, NÃO refaça do zero.

${bullets}`
}
