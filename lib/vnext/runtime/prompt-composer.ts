// lib/vnext/runtime/prompt-composer.ts
//
// Compõe o `CompleteInput` que vai pro Gateway. Fase 2B.6:
//
//   Antes (stub Fase 1): dump de metadata cru como system message.
//     "atenis-method-phase: diagnose\ntopic: X\nmastery: 0..."
//
//   Agora: orquestração modular de 7 fragmentos em `./prompt/`:
//     1. PROMPT_VOICE         (sempre)  — tom, persona, pedagogia base
//     2. EPISTEMIC_RULES      (sempre)  — 8 regras Critic em prosa
//     3. buildGradeContext    (sempre)  — série, matéria, regra ENEM
//     4. buildSubjectFocus    (se ctx)  — foco da matéria
//     5. buildPhaseGoal       (sempre)  — objetivo pedagógico da fase
//     6. buildQuestionBrief   (se Q)    — question do bank SEM gabarito
//     7. buildStudentEventBrief (se ev) — evento do aluno em prosa
//     8. buildRefinementBrief (se hint) — feedback do Critic em prosa
//
// Ordem intencional: tom → regras → contexto → objetivo → material →
// interação. Modelo lê de cima pra baixo, cada camada progressivamente
// mais específica.
//
// INVARIANTES preservadas:
//   - useCase = `atenis.<phase>` — testes e MockProvider chaveam por isso.
//   - `role:"user"` só carrega mensagem do aluno (nada de metadata).
//   - filter(Boolean) — camadas ausentes viram no-op.

import type { CompleteInput } from "../gateway/types"
import type { RefinementHint } from "../schema/critic"
import type { StudentEvent } from "../engine/events"
import type { MethodPhase } from "../engine/phases"
import type { LearningTopicState } from "../learning/types"
import type { Question } from "../questions/types"

import { PROMPT_VOICE } from "./prompt/voice"
import { EPISTEMIC_RULES } from "./prompt/epistemic-rules"
import { buildGradeContext } from "./prompt/grade-context"
import { buildSubjectFocus } from "./prompt/subject-focus"
import { buildPhaseGoal } from "./prompt/phase-goal"
import { buildQuestionBrief } from "./prompt/question-brief"
import { buildStudentEventBrief } from "./prompt/student-event-brief"
import { buildRefinementBrief } from "./prompt/refinement-brief"

export interface ComposeRequestInput {
  phase: MethodPhase
  state: LearningTopicState
  message: string
  event: StudentEvent | null
  feedback?: RefinementHint[]
  selectedQuestion?: Question | null
}

const FRAGMENT_SEPARATOR = "\n\n---\n\n"

export function composeGenerationRequest(
  input: ComposeRequestInput,
): CompleteInput {
  const { phase, state, message, event, feedback, selectedQuestion } = input
  const useCase = `atenis.${phase}`

  const fragments: (string | null | false)[] = [
    PROMPT_VOICE,
    EPISTEMIC_RULES,
    buildGradeContext(state.context),
    buildSubjectFocus(state.context),
    buildPhaseGoal(phase, state),
    selectedQuestion ? buildQuestionBrief(selectedQuestion, phase) : null,
    event ? buildStudentEventBrief(event) : null,
    feedback && feedback.length > 0 ? buildRefinementBrief(feedback) : null,
  ]
  const systemContent = fragments
    .filter((s): s is string => Boolean(s))
    .join(FRAGMENT_SEPARATOR)

  const messages: CompleteInput["messages"] = [
    { role: "system", content: systemContent },
  ]
  if (message.trim().length > 0) {
    messages.push({ role: "user", content: message })
  }
  return { messages, useCase }
}
