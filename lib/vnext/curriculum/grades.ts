// lib/vnext/curriculum/grades.ts
//
// Registry curricular do Brasil (6º–9º EF + 1º–3º EM). Aberto pra
// expansão (adicionar nova série é adicionar entrada). Reconhece
// variantes comuns de escrita ("1", "1º", "1EM", "EM01").

import type { GradeCode, GradeInfo, SchoolStage } from "./types"

const REGISTRY: readonly GradeInfo[] = [
  { code: "6", schoolStage: "middle", labelPt: "6º ano — Ensino Fundamental", order: 1 },
  { code: "7", schoolStage: "middle", labelPt: "7º ano — Ensino Fundamental", order: 2 },
  { code: "8", schoolStage: "middle", labelPt: "8º ano — Ensino Fundamental", order: 3 },
  { code: "9", schoolStage: "middle", labelPt: "9º ano — Ensino Fundamental", order: 4 },
  { code: "EM01", schoolStage: "high", labelPt: "1º ano — Ensino Médio", order: 5 },
  { code: "EM02", schoolStage: "high", labelPt: "2º ano — Ensino Médio", order: 6 },
  { code: "EM03", schoolStage: "high", labelPt: "3º ano — Ensino Médio", order: 7 },
]

const BY_CODE: Map<string, GradeInfo> = new Map(
  REGISTRY.map((g) => [g.code, g]),
)

// Aliases: aceita "1", "1EM", "1º" etc pra EM01.
const ALIASES: Record<string, string> = {
  "1": "EM01",
  "1EM": "EM01",
  "1º": "EM01",
  "2": "EM02",
  "2EM": "EM02",
  "2º": "EM02",
  "3": "EM03",
  "3EM": "EM03",
  "3º": "EM03",
  "6º": "6",
  "7º": "7",
  "8º": "8",
  "9º": "9",
}

export function parseGradeCode(input: string): GradeInfo | null {
  const cleaned = input.trim()
  if (!cleaned) return null
  const canonical = ALIASES[cleaned] ?? cleaned
  return BY_CODE.get(canonical) ?? null
}

export function listGrades(): readonly GradeInfo[] {
  return REGISTRY
}

export function schoolStageOf(code: GradeCode): SchoolStage | null {
  return parseGradeCode(code)?.schoolStage ?? null
}

export function isMiddle(code: GradeCode): boolean {
  return schoolStageOf(code) === "middle"
}

export function isHigh(code: GradeCode): boolean {
  return schoolStageOf(code) === "high"
}
