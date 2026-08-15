// lib/vnext/runtime/select-question.ts
//
// Fase 2A.2: seleção de questão pra generative phase que apresenta ao
// aluno (diagnose/practice/verify). Módulo separado pra manter Runtime
// orquestrador enxuto.

import type { EducationalContext } from "../context/types"
import type { MethodPhase } from "../engine/phases"
import { activeMisconceptions } from "../learning/updates"
import type { LearningTopicState } from "../learning/types"
import type { QuestionSelector } from "../questions/selector"
import type { Question } from "../questions/types"
import type { TraceEntry } from "./types"

export type SelectQuestionOutcome =
  | { kind: "picked"; question: Question }
  | { kind: "none" }
  | { kind: "skipped" } // selector ausente

const PHASES_THAT_NEED_QUESTION: MethodPhase[] = [
  "diagnose",
  "practice",
  "verify",
]

export function phaseNeedsQuestion(phase: MethodPhase): boolean {
  return PHASES_THAT_NEED_QUESTION.includes(phase)
}

export async function selectQuestionForPhase(args: {
  selector: QuestionSelector | undefined
  state: LearningTopicState
  context: EducationalContext | null
  phase: MethodPhase
  now: () => string
  trace: TraceEntry[]
}): Promise<SelectQuestionOutcome> {
  const { selector, state, context, phase, now, trace } = args
  if (!selector) return { kind: "skipped" }
  if (!context) return { kind: "skipped" } // caller decidiu como tratar
  if (!phaseNeedsQuestion(phase)) return { kind: "skipped" }

  const active = activeMisconceptions(state)
  const question = await selector.select({
    subject: context.subject,
    grade: context.grade,
    topic: state.topic,
    phase,
    skill: context.skill,
    excludeIds: state.answeredSuccessfully,
    preferAddressingCodes: active,
  })
  trace.push({
    at: now(),
    step: "runtime.select-question",
    detail: {
      phase,
      selectedId: question?.id ?? null,
      activeMisconceptions: active,
      excludeIds: state.answeredSuccessfully,
      contextSubject: context.subject,
      contextGrade: context.grade,
    },
  })
  return question ? { kind: "picked", question } : { kind: "none" }
}
