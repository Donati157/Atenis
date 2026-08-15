// test/vnext/misconceptions/registry.test.ts
//
// D. Misconception conhecida é registrada.
// E'. Registry rejeita duplicata e shape inválido.

import { describe, it, expect } from "vitest"
import {
  InMemoryMisconceptionRegistry,
  MisconceptionRegistryError,
  QUADRATICA_MISCONCEPTIONS,
  type MisconceptionEntry,
} from "../../../lib/vnext/misconceptions"

function baseEntry(over: Partial<MisconceptionEntry> = {}): MisconceptionEntry {
  return {
    id: "m1",
    description: "erro base",
    subjects: [],
    topics: [],
    grades: [],
    severity: "major",
    ...over,
  }
}

describe("InMemoryMisconceptionRegistry — registro", () => {
  it("registra entry válida", async () => {
    const r = new InMemoryMisconceptionRegistry()
    await r.register(baseEntry())
    expect(r.exists("m1")).toBe(true)
    expect(r.get("m1")?.description).toBe("erro base")
  })

  it("rejeita duplicata", async () => {
    const r = new InMemoryMisconceptionRegistry()
    await r.register(baseEntry())
    await expect(r.register(baseEntry())).rejects.toBeInstanceOf(
      MisconceptionRegistryError,
    )
  })

  it("rejeita shape inválido", async () => {
    const r = new InMemoryMisconceptionRegistry()
    // @ts-expect-error input cru
    await expect(r.register({ id: "" })).rejects.toBeInstanceOf(
      MisconceptionRegistryError,
    )
  })

  it("registerAll carrega catálogo completo", async () => {
    const r = new InMemoryMisconceptionRegistry()
    await r.registerAll(QUADRATICA_MISCONCEPTIONS)
    expect(r.list().length).toBe(QUADRATICA_MISCONCEPTIONS.length)
    expect(r.exists("sign-confusion-b")).toBe(true)
  })

  it("listByTopic filtra corretamente", async () => {
    const r = new InMemoryMisconceptionRegistry()
    await r.registerAll(QUADRATICA_MISCONCEPTIONS)
    const rows = r.listByTopic("funcao-quadratica")
    expect(rows.length).toBeGreaterThan(0)
    for (const m of rows) expect(m.topics).toContain("funcao-quadratica")
  })
})
