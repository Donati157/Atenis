// test/vnext/critic/determinism.test.ts
//
// Prova que analyze é determinístico:
//   1. Mesma fixture rodada N vezes → resultado bit-idêntico.
//   2. Mesma resposta em ordem diferente das arrays → conjunto de issues
//      equivalente (mesmos codes, contagens iguais); a ORDEM textual do
//      report pode variar porque as regras iteram na ordem do array.

import { describe, it, expect } from "vitest"
import { analyze } from "../../../lib/vnext/critic"
import type { StructuredResponse } from "../../../lib/vnext/schema/epistemic"

import fixtureA from "../fixtures/responses/A-valid.json"
import fixtureB from "../fixtures/responses/B-claim-without-evidence.json"

const N_RUNS = 20

describe("determinism — analyze é bit-idêntico entre execuções", () => {
  it("fixture A rodada N vezes produz mesmo JSON", () => {
    const first = JSON.stringify(analyze(fixtureA))
    for (let i = 0; i < N_RUNS; i++) {
      expect(JSON.stringify(analyze(fixtureA))).toBe(first)
    }
  })

  it("fixture B (com refine hints) rodada N vezes produz mesmo JSON", () => {
    const first = JSON.stringify(analyze(fixtureB))
    for (let i = 0; i < N_RUNS; i++) {
      expect(JSON.stringify(analyze(fixtureB))).toBe(first)
    }
  })
})

describe("determinism — ordem semanticamente equivalente", () => {
  it("permutação das claims produz o mesmo conjunto de issue codes", () => {
    const original = fixtureA as unknown as StructuredResponse
    // parseamos via analyze pra obter defaults aplicados
    const originalReport = analyze(original)
    const originalCodeCounts = countCodes(originalReport.issues.map((i) => i.code))

    const permuted: StructuredResponse = {
      ...original,
      claims: [...original.claims].reverse(),
      evidences: [...original.evidences].reverse(),
      sources: [...original.sources].reverse(),
    }
    const permutedReport = analyze(permuted)
    const permutedCodeCounts = countCodes(
      permutedReport.issues.map((i) => i.code),
    )

    expect(permutedCodeCounts).toEqual(originalCodeCounts)
    expect(permutedReport.recommendedAction).toBe(originalReport.recommendedAction)
    expect(permutedReport.checksExecuted).toBe(originalReport.checksExecuted)
    expect(permutedReport.checksFailed).toBe(originalReport.checksFailed)
  })
})

function countCodes(codes: string[]): Record<string, number> {
  const acc: Record<string, number> = {}
  for (const c of codes) acc[c] = (acc[c] ?? 0) + 1
  return acc
}
