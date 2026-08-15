// lib/vnext/runtime/types.ts

import type { CriticReport } from "../schema/critic"
import type { StructuredResponse } from "../schema/epistemic"
import type { AIGateway } from "../gateway/types"
import type { Clock } from "../clock"
import type { IdGenerator } from "../ids"
import type { StudentEvent } from "../engine/events"
import type { MethodPhase } from "../engine/phases"
import type { TeachingStrategy } from "../engine/strategies"
import type { LearningTopicState } from "../learning/types"
import type { LearningStore } from "../learning/store"
import type { MethodEngine } from "../engine"
import type { StudentAnswerEvaluator } from "../evaluator/types"
import type { QuestionBank } from "../questions/bank"
import type { QuestionSelector } from "../questions/selector"
import type { Question } from "../questions/types"
import type { EducationalContext } from "../context/types"
import type { MisconceptionRegistry } from "../misconceptions/registry"
import type { BudgetSnapshot } from "./budgets"
import type { ProviderInvocationDiagnostic } from "../gateway/errors"

export interface RuntimeDeps {
  gateway: AIGateway
  engine: MethodEngine
  store: LearningStore
  clock: Clock
  ids: IdGenerator
  criticAnalyze: (response: unknown) => CriticReport
  // Fase 1.1
  evaluator?: StudentAnswerEvaluator
  // Fase 2A.1: Runtime AGORA consulta o selector antes de generative
  // phases (diagnose/practice/verify) quando `requireQuestion=true`.
  // Sem selector, Runtime segue com LLM inventando.
  questionSelector?: QuestionSelector
  // Fase 2A.1: pra resolver `answerContext.questionId` → Question e passar
  // `questionRef` ao evaluator com commonErrors + expectedAnswer.
  questionBank?: QuestionBank
  // Fase 2A.1: quando true, se selector devolver null em fase que
  // precisa de questão, Runtime aborta com reason "question-unavailable"
  // em vez de deixar o LLM inventar silenciosamente.
  requireQuestion?: boolean
  // Fase 2A.2: registry de misconceptions catalogadas. Se presente,
  // EvaluationError.code é validado ANTES de persistir no state; code
  // desconhecido vira UNKNOWN_MISCONCEPTION no trace mas NÃO grava.
  misconceptionRegistry?: MisconceptionRegistry
  // Fase 2A.2 (final): quando `evaluator` está injetado, o registry
  // é OBRIGATÓRIO. Pra Runtimes de teste/fixture que aceitam qualquer
  // code, marcar EXPLICITAMENTE com esta flag. Nome verboso é
  // proposital pra desincentivar uso em produção.
  allowMissingMisconceptionRegistry?: boolean
}

// Fase 1.1: contexto pra o evaluator. O consumer que sabe QUAL questão o
// aluno respondeu passa esse objeto. Ausente = fallback pra event.correct.
// Fase 2A.1: `questionId` opcional pra rastrear a questão do Bank.
export interface AnswerContext {
  question: string
  questionId?: string
  expectedKnowledge?: string
  rubricId?: string
}

export interface RuntimeInput {
  studentId: string
  topic: string
  message: string
  studentEvent?: StudentEvent | null
  answerContext?: AnswerContext | null
  // Fase 2A.2: contexto educacional. Setado na PRIMEIRA interação com
  // esse topic; grava no state e é reusado nos ticks seguintes. Se
  // ausente e state também não tem, e o path precisa (selector ou
  // questionRef), Runtime aborta com "educational-context-required".
  context?: EducationalContext
  // Fase 2A: marca EXPLICITAMENTE que o consumer confia no
  // event.correct. Sem esta flag e sem answerContext + evaluator,
  // Runtime aborta com reason. Impede uso silencioso de "trust me".
  trustedEvaluation?: boolean
  priorState?: LearningTopicState
}

export interface TraceEntry {
  at: string
  step: string
  detail?: Record<string, unknown>
}

export type AbortReason =
  | "tick-limit"
  | "generative-limit"
  | "adapt-limit"
  | "critic-reject"
  | "refine-exhausted"
  | "provider-error"
  | "evaluator-error"
  | "no-viable-strategy"
  | "answer-context-required"
  | "no-evaluator-and-not-trusted"
  | "question-unavailable"
  | "educational-context-required"
  | "question-id-required"
  | "question-id-mismatch"
  // Fase 2A.2 final
  | "misconception-registry-required"

export interface RuntimeOutput {
  studentId: string
  topic: string
  executedPhase: MethodPhase
  nextExpectedPhase: MethodPhase
  awaitingStudentInput: boolean
  strategy: TeachingStrategy | null
  transitionReason: string
  reply: StructuredResponse | null
  criticReport: CriticReport | null
  refinementAttempts: number
  aborted?: {
    reason: AbortReason
    detail?: string
    issueCodes?: string[]
    // Fase 2B.5-diag: quando o abort veio de um provider real, propaga
    // a metadata sanitizada. Só populado se ATENIS_PROVIDER_DIAGNOSTIC=true
    // no momento da falha. NUNCA contém prompt/response/apiKey — só campos
    // sanitizados via extractErrorProps.
    diagnostic?: ProviderInvocationDiagnostic
  }
  // Fase 2A.1: questão apresentada nesta fase (quando selecionada do
  // Bank). Consumer usa `id` no próximo tick como `answerContext.questionId`.
  selectedQuestion?: Question | null
  state: LearningTopicState
  budgets: BudgetSnapshot
  trace: TraceEntry[]
}
