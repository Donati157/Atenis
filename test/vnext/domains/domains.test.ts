// test/vnext/domains/domains.test.ts

import { describe, it, expect } from "vitest"
import {
  AcademicDomainRegistryError,
  CURRENT_ATENIS_DOMAINS,
  InMemoryAcademicDomainRegistry,
  PLANNED_DOMAIN_STUBS,
  academicDomainSchema,
} from "../../../lib/vnext/domains"

describe("AcademicDomain schema", () => {
  it("aceita school domain", () => {
    const d = {
      id: "matematica",
      name: "Matemática",
      domainType: "school",
      framework: "bncc",
    }
    expect(academicDomainSchema.safeParse(d).success).toBe(true)
  })

  it("aceita AP domain", () => {
    const d = {
      id: "ap-microeconomics",
      name: "AP Microeconomics",
      domainType: "ap",
      framework: "ap-ced",
    }
    expect(academicDomainSchema.safeParse(d).success).toBe(true)
  })

  it("aceita language domain sem grade", () => {
    const d = {
      id: "japanese-language",
      name: "Japanese",
      domainType: "language",
      framework: "cefr",
    }
    expect(academicDomainSchema.safeParse(d).success).toBe(true)
  })

  it("rejeita domainType inválido", () => {
    const d = {
      id: "x",
      name: "X",
      domainType: "hobby",
    }
    expect(academicDomainSchema.safeParse(d).success).toBe(false)
  })
})

describe("InMemoryAcademicDomainRegistry", () => {
  it("registra current + stubs", async () => {
    const r = new InMemoryAcademicDomainRegistry()
    await r.registerAll(CURRENT_ATENIS_DOMAINS)
    await r.registerAll(PLANNED_DOMAIN_STUBS)
    expect(r.exists("matematica")).toBe(true)
    expect(r.exists("ap-microeconomics")).toBe(true)
    expect(r.exists("japanese-language")).toBe(true)
  })

  it("rejeita duplicata", async () => {
    const r = new InMemoryAcademicDomainRegistry()
    await r.register(CURRENT_ATENIS_DOMAINS[0])
    await expect(
      r.register(CURRENT_ATENIS_DOMAINS[0]),
    ).rejects.toBeInstanceOf(AcademicDomainRegistryError)
  })

  it("listByType filtra school", async () => {
    const r = new InMemoryAcademicDomainRegistry()
    await r.registerAll([...CURRENT_ATENIS_DOMAINS, ...PLANNED_DOMAIN_STUBS])
    const schools = r.listByType("school")
    for (const s of schools) expect(s.domainType).toBe("school")
    expect(schools.map((s) => s.id).sort()).toEqual(
      ["matematica", "portugues"].sort(),
    )
  })

  it("listByType filtra language", async () => {
    const r = new InMemoryAcademicDomainRegistry()
    await r.registerAll([...CURRENT_ATENIS_DOMAINS, ...PLANNED_DOMAIN_STUBS])
    const langs = r.listByType("language")
    expect(langs.map((s) => s.id)).toContain("japanese-language")
  })
})
