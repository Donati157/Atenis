// lib/vnext/runtime/prompt/subject-focus.ts
//
// Bloco de FOCO POR MATÉRIA. Reusa `SUBJECT_PROMPTS` do legado
// (`lib/subjects.ts`), pegando SÓ o primeiro parágrafo — matemática, por
// exemplo, tem o MATEMATICA_CURRICULUM inteiro concatenado (~1600
// tokens) o que estouraria o orçamento por turno. O curriculum longo
// vira responsabilidade de outra camada (question bank, phase-goal),
// não do subject focus.
//
// Mapeamento: `context.subject` (string livre, mas na prática canonical
// é o SubjectId do legado) → SUBJECT_PROMPTS[subject]. Se matéria não
// existir no legado, retorna null (composer omite o bloco).

import { SUBJECT_PROMPTS, type SubjectId } from "../../../subjects"
import type { EducationalContext } from "../../context/types"

function firstParagraph(text: string): string {
  const idx = text.indexOf("\n\n")
  return idx > 0 ? text.slice(0, idx).trim() : text.trim()
}

/**
 * Compõe o bloco de FOCO POR MATÉRIA. Retorna null se:
 *   - context é null
 *   - context.subject não está no registry legado
 *
 * Sempre trunca no primeiro parágrafo pra manter budget < ~120 tokens
 * por matéria (matemática inclui MATEMATICA_CURRICULUM completo depois).
 */
export function buildSubjectFocus(
  context: EducationalContext | null,
): string | null {
  if (!context) return null
  const subject = context.subject as SubjectId
  const raw = SUBJECT_PROMPTS[subject]
  if (!raw) return null
  return `## FOCO DA MATÉRIA
${firstParagraph(raw)}`
}
