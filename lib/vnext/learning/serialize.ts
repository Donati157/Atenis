// lib/vnext/learning/serialize.ts
//
// Serialização + validação de LearningTopicState.
//
// Serialize: state → objeto puro serializável (via structuredClone-like)
//   com garantia de que roundtrip preserva TODOS os campos e ordem
//   estável de arrays.
//
// Deserialize: valida contra Zod schema, aplica migração se schemaVersion
//   for antiga, e devolve state validado.
//
// Fase 1.1 só define version 1. Se um dia tiver version 2, adicionar
// migração 1→2 aqui.

import { z } from "zod"
import { LEARNING_STATE_SCHEMA_VERSION } from "./types"
import type { LearningTopicState } from "./types"

// -----------------------------------------------------------------------
// SCHEMAS
// -----------------------------------------------------------------------

const teachingStrategySchema = z.enum([
  "worked_example",
  "analogy",
  "socratic",
  "first_principles",
  "visual_diagram",
])

const methodPhaseSchema = z.enum([
  "diagnose",
  "teach",
  "practice",
  "evaluate",
  "adapt",
  "verify",
  "ready",
  "abort",
])

const masterySchema = z.enum(["unknown", "emerging", "developing", "secure"])

const attemptOutcomeSchema = z.enum(["success", "failure", "partial"])

const attemptRecordSchema = z.object({
  strategy: teachingStrategySchema,
  outcome: attemptOutcomeSchema,
  methodPhase: methodPhaseSchema,
  eventKind: z.enum(["answer", "confused"]),
  questionId: z.string().nullable(),
  at: z.string(),
})

// Fase 2A.2: `resolved` renomeado pra `resolvedEvidence`.
const misconceptionRecordSchema = z.object({
  code: z.string().min(1).max(80),
  topic: z.string().min(1).max(80),
  attempts: z.number().int().min(0),
  resolvedEvidence: z.number().int().min(0),
  lastSeen: z.string(),
})

// Fase 2A.2 (final): contexto persistido no state. grade e schoolStage
// opcionais pra suportar domínios sem currículo escolar (AP, língua,
// interdisciplinar). Adicionar framework/proficiencyLevel opcionais.
const educationalContextInStateSchema = z
  .object({
    subject: z.string().min(1).max(60),
    grade: z.string().min(1).max(16).optional(),
    schoolStage: z.string().min(1).max(40).optional(),
    skill: z.string().min(1).max(200).optional(),
    framework: z.string().min(1).max(60).optional(),
    proficiencyLevel: z.string().min(1).max(40).optional(),
  })
  .nullable()

const strategyEffectivenessSchema = z.object({
  strategy: teachingStrategySchema,
  tries: z.number().int().min(0),
  successes: z.number().int().min(0),
})

const lastStudentEventKindSchema = z
  .enum(["start", "answer", "confused", "self-report-ready"])
  .nullable()

export const learningTopicStateSchema = z.object({
  schemaVersion: z.literal(LEARNING_STATE_SCHEMA_VERSION),
  studentId: z.string().min(1).max(128),
  topic: z.string().min(1).max(128),
  context: educationalContextInStateSchema,
  mastery: masterySchema,
  attempts: z.array(attemptRecordSchema).max(500),
  strategyEffectiveness: z.array(strategyEffectivenessSchema).max(20),
  misconceptions: z.array(misconceptionRecordSchema).max(100),
  answeredSuccessfully: z.array(z.string().min(1).max(128)).max(500),
  pendingQuestionId: z.string().max(128).nullable(),
  currentMethodPhase: methodPhaseSchema,
  currentStrategy: teachingStrategySchema.nullable(),
  lastStudentEventKind: lastStudentEventKindSchema,
  ticks: z.number().int().min(0),
  generativeTurns: z.number().int().min(0),
  refinementAttempts: z.number().int().min(0),
  adaptCount: z.number().int().min(0),
  verifyPassStreak: z.number().int().min(0),
  createdAt: z.string(),
  lastUpdatedAt: z.string(),
})

// -----------------------------------------------------------------------
// SERIALIZE
// -----------------------------------------------------------------------

export function serializeState(state: LearningTopicState): unknown {
  // JSON roundtrip garante que o resultado é puro (sem funcs, Date, etc.).
  return JSON.parse(JSON.stringify(state))
}

// -----------------------------------------------------------------------
// DESERIALIZE + MIGRAÇÃO
// -----------------------------------------------------------------------

export interface DeserializeSuccess {
  ok: true
  state: LearningTopicState
  migrated: boolean
  fromVersion: number
}

export interface DeserializeFailure {
  ok: false
  issues: unknown
  hint: string
}

export type DeserializeResult = DeserializeSuccess | DeserializeFailure

export function deserializeState(raw: unknown): DeserializeResult {
  const migrated = tryMigrate(raw)
  const parsed = learningTopicStateSchema.safeParse(migrated.value)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues,
      hint: "Payload não bate no LearningTopicState schema. Cheque schemaVersion e todos os campos requeridos.",
    }
  }
  return {
    ok: true,
    state: parsed.data,
    migrated: migrated.migrated,
    fromVersion: migrated.fromVersion,
  }
}

interface MigrationResult {
  value: unknown
  migrated: boolean
  fromVersion: number
}

function tryMigrate(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { value: raw, migrated: false, fromVersion: -1 }
  }
  const obj = raw as Record<string, unknown>
  const version =
    typeof obj.schemaVersion === "number" ? obj.schemaVersion : 0
  if (version === LEARNING_STATE_SCHEMA_VERSION) {
    return { value: raw, migrated: false, fromVersion: version }
  }

  // v0 → v1: pré-1.1 (sem schemaVersion, com cycleCount).
  let working: Record<string, unknown> = obj
  let fromVersion = version
  if (version === 0) {
    working = {
      ...working,
      ticks:
        typeof working.cycleCount === "number" ? working.cycleCount : 0,
      generativeTurns: 0,
      refinementAttempts: 0,
      lastStudentEventKind: null,
      schemaVersion: 1,
    }
    delete working.cycleCount
    if (Array.isArray(working.attempts)) {
      working.attempts = (working.attempts as unknown[]).map((a) => {
        if (a && typeof a === "object" && !("eventKind" in a)) {
          return { ...(a as Record<string, unknown>), eventKind: "answer" }
        }
        return a
      })
    }
    fromVersion = 0
  }

  // v1 → v2 (Fase 2A.1): adiciona misconceptions/answeredSuccessfully
  // e questionId nos attempts.
  if (
    typeof working.schemaVersion === "number" &&
    working.schemaVersion < 2
  ) {
    working = {
      ...working,
      schemaVersion: 2,
      misconceptions: Array.isArray(working.misconceptions)
        ? working.misconceptions
        : [],
      answeredSuccessfully: Array.isArray(working.answeredSuccessfully)
        ? working.answeredSuccessfully
        : [],
    }
    if (Array.isArray(working.attempts)) {
      working.attempts = (working.attempts as unknown[]).map((a) => {
        if (a && typeof a === "object" && !("questionId" in a)) {
          return { ...(a as Record<string, unknown>), questionId: null }
        }
        return a
      })
    }
    if (fromVersion === version && fromVersion !== 0) fromVersion = 1
  }

  // v2 → v3 (Fase 2A.2): renomeia misconception.resolved → resolvedEvidence,
  // adiciona context (null) e pendingQuestionId (null).
  if (
    typeof working.schemaVersion === "number" &&
    working.schemaVersion < 3
  ) {
    const rawMisconceptions = Array.isArray(working.misconceptions)
      ? working.misconceptions
      : []
    working = {
      ...working,
      schemaVersion: 3,
      context: working.context ?? null,
      pendingQuestionId:
        typeof working.pendingQuestionId === "string"
          ? working.pendingQuestionId
          : null,
      misconceptions: rawMisconceptions.map((m) => {
        if (m && typeof m === "object") {
          const rec = m as Record<string, unknown>
          if ("resolved" in rec && !("resolvedEvidence" in rec)) {
            return {
              ...rec,
              resolvedEvidence: rec.resolved,
              resolved: undefined,
            }
          }
        }
        return m
      }),
    }
    // Remove chave antiga que sobrou:
    working.misconceptions = (working.misconceptions as unknown[]).map((m) => {
      if (m && typeof m === "object") {
        const rec = { ...(m as Record<string, unknown>) }
        delete rec.resolved
        return rec
      }
      return m
    })
    if (fromVersion === version && fromVersion === 0) {
      /* already set to 0 */
    } else if (
      fromVersion === version ||
      fromVersion === 1
    ) {
      fromVersion = 2
    }
  }

  const anyChange =
    working !== obj || fromVersion !== LEARNING_STATE_SCHEMA_VERSION
  return {
    value: working,
    migrated: anyChange,
    fromVersion:
      fromVersion === LEARNING_STATE_SCHEMA_VERSION ? version : fromVersion,
  }
}
