// test/vnext/knowledge/source-registry.test.ts
//
// A. Source pode ser registrada.
// B. Source NÃO pode se declarar "verified" sem provenance válida.
// K. Source inválida não pode ser silenciosamente aceita.

import { describe, it, expect } from "vitest"
import {
  InMemorySourceRegistry,
  SourceRegistryError,
  type SourceRecord,
} from "../../../lib/vnext/knowledge"

function baseSource(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    id: "s1",
    type: "textbook",
    title: "Livro didático de matemática",
    authorityTier: "textbook",
    retrievedAt: "2026-08-11T00:00:00.000Z",
    provenance: { status: "unverified", verificationMethod: "none" },
    subjects: ["matematica"],
    grades: ["EM01"],
    topics: ["funcao-quadratica"],
    curatedAt: "2026-08-11T00:00:00.000Z",
    curatedBy: "atenis-curator",
    ...overrides,
  }
}

describe("A. registrar Source válida", () => {
  it("aceita source unverified com metadata", async () => {
    const reg = new InMemorySourceRegistry()
    const s = await reg.register(baseSource())
    expect(s.id).toBe("s1")
    expect(await reg.has("s1")).toBe(true)
  })

  it("aceita source verified quando provenance é completa", async () => {
    const reg = new InMemorySourceRegistry()
    const s = await reg.register(
      baseSource({
        id: "s-verified",
        provenance: {
          status: "verified",
          verificationMethod: "manual-curator",
          verifiedAt: "2026-08-01T00:00:00.000Z",
        },
      }),
    )
    expect(s.provenance.status).toBe("verified")
  })
})

describe("B. Source verified exige provenance válida", () => {
  it("rejeita verified com verificationMethod=none", async () => {
    const reg = new InMemorySourceRegistry()
    await expect(
      reg.register(
        baseSource({
          provenance: {
            status: "verified",
            verificationMethod: "none",
            verifiedAt: "2026-08-01T00:00:00.000Z",
          },
        }),
      ),
    ).rejects.toBeInstanceOf(SourceRegistryError)
  })

  it("rejeita verified sem verifiedAt", async () => {
    const reg = new InMemorySourceRegistry()
    await expect(
      reg.register(
        baseSource({
          provenance: {
            status: "verified",
            verificationMethod: "manual-curator",
            // sem verifiedAt
          },
        }),
      ),
    ).rejects.toBeInstanceOf(SourceRegistryError)
  })

  it("erro tem code específico pra rastreio", async () => {
    const reg = new InMemorySourceRegistry()
    try {
      await reg.register(
        baseSource({
          provenance: {
            status: "verified",
            verificationMethod: "none",
            verifiedAt: "2026-08-01T00:00:00.000Z",
          },
        }),
      )
      throw new Error("should have thrown")
    } catch (err) {
      const e = err as SourceRegistryError
      expect(e.code).toBe("INVALID_VERIFIED_WITHOUT_METHOD")
    }
  })
})

describe("K. shape inválido é rejeitado (não silencioso)", () => {
  it("faltando campo obrigatório → erro", async () => {
    const reg = new InMemorySourceRegistry()
    // @ts-expect-error — passando payload cru inválido pra testar shape
    await expect(reg.register({ id: "x" })).rejects.toBeInstanceOf(
      SourceRegistryError,
    )
  })

  it("authorityTier inválido → erro", async () => {
    const reg = new InMemorySourceRegistry()
    await expect(
      reg.register(
        baseSource({
          authorityTier: "invented" as never,
        }),
      ),
    ).rejects.toBeInstanceOf(SourceRegistryError)
  })

  it("id duplicado → erro", async () => {
    const reg = new InMemorySourceRegistry()
    await reg.register(baseSource())
    await expect(reg.register(baseSource())).rejects.toBeInstanceOf(
      SourceRegistryError,
    )
  })
})

describe("get/list/findBy*", () => {
  it("get devolve null pra id desconhecido", async () => {
    const reg = new InMemorySourceRegistry()
    expect(await reg.get("nope")).toBeNull()
  })

  it("findBySubject", async () => {
    const reg = new InMemorySourceRegistry()
    await reg.register(baseSource({ id: "s-mat", subjects: ["matematica"] }))
    await reg.register(baseSource({ id: "s-pt", subjects: ["portugues"] }))
    const mat = await reg.findBySubject("matematica")
    expect(mat.map((s) => s.id)).toEqual(["s-mat"])
  })
})
