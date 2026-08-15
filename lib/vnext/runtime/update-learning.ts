// lib/vnext/runtime/update-learning.ts
//
// Fase 2A.2: aplica atualizações no Learning State depois do evaluate:
//   - Registra misconceptions VÁLIDAS (validadas contra registry).
//   - Marca answeredSuccessfully + resolve misconceptions endereçadas.
//
// Codes não presentes no registry viram trace UNKNOWN_MISCONCEPTION —
// não persistem no state. Isso impede o LLM (evaluator) de contaminar
// o learning state com codes inventados.

import type { LearningTopicState } from "../learning/types"
import {
  addAnsweredSuccessfully,
  recordMisconception,
  resolveMisconceptionsFromQuestion,
} from "../learning/updates"
import type { MisconceptionRegistry } from "../misconceptions/registry"
import type { QuestionBank } from "../questions/bank"
import type { TraceEntry } from "./types"

export function applyDetectedMisconceptions(args: {
  state: LearningTopicState
  codes: string[]
  registry: MisconceptionRegistry | undefined
  at: string
  trace: TraceEntry[]
}): LearningTopicState {
  const { registry, at, trace } = args
  let state = args.state
  const accepted: string[] = []
  const unknown: string[] = []
  for (const code of args.codes) {
    if (registry && !registry.exists(code)) {
      unknown.push(code)
      continue
    }
    state = recordMisconception(state, code, at)
    accepted.push(code)
  }
  if (unknown.length > 0) {
    trace.push({
      at,
      step: "runtime.evaluate.unknown-misconception",
      detail: { unknown, hint: "codes ausentes do MisconceptionRegistry" },
    })
  }
  if (accepted.length > 0) {
    trace.push({
      at,
      step: "runtime.evaluate.misconceptions-recorded",
      detail: { accepted },
    })
  }
  return state
}

// Marca answeredSuccessfully e resolve misconceptions se essa é a
// PRIMEIRA vez que essa Q foi acertada (evita dupla-contagem de evidência).
export async function applySuccessResolution(args: {
  state: LearningTopicState
  questionId: string
  bank: QuestionBank | undefined
  at: string
  trace: TraceEntry[]
}): Promise<LearningTopicState> {
  const { questionId, bank, at, trace } = args
  const alreadyAnswered = args.state.answeredSuccessfully.includes(questionId)
  let state = addAnsweredSuccessfully(args.state, questionId)
  if (!alreadyAnswered && bank) {
    const q = await bank.getById(questionId)
    if (q && q.commonErrors.length > 0) {
      const codes = q.commonErrors.map((e) => e.code)
      state = resolveMisconceptionsFromQuestion(state, codes, at)
      trace.push({
        at,
        step: "runtime.evaluate.misconceptions-resolved",
        detail: { questionId, addressedCodes: codes },
      })
    }
  }
  return state
}
