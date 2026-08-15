// test/vnext/datasets/quadratica.test.ts
//
// L. dataset de função quadrática é recuperável e funciona ponta-a-ponta.
// Também demonstra o critério final:
//   "Tenho uma questão real de função quadrática."

import { describe, it, expect } from "vitest"
import {
  InMemorySourceRegistry,
} from "../../../lib/vnext/knowledge"
import {
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
} from "../../../lib/vnext/questions"
import {
  QUADRATICA_QUESTIONS,
  QUADRATICA_SOURCES,
  loadQuadraticaDataset,
} from "../../../lib/vnext/datasets/matematica-funcao-quadratica"

async function fixture() {
  const registry = new InMemorySourceRegistry()
  const bank = new InMemoryQuestionBank(registry)
  const { sources, questions } = await loadQuadraticaDataset(registry, bank)
  return { registry, bank, sources, questions }
}

describe("L. dataset de função quadrática — inventário", () => {
  it("carrega 2 sources e 6 questions sem erro", async () => {
    const { sources, questions } = await fixture()
    expect(sources).toBe(2)
    expect(questions).toBe(6)
  })

  it("Source BNCC é verified com verificationMethod e verifiedAt", async () => {
    const { registry } = await fixture()
    const bncc = await registry.get("bncc-em13mat302")
    expect(bncc).not.toBeNull()
    expect(bncc!.provenance.status).toBe("verified")
    expect(bncc!.provenance.verificationMethod).toBe("manual-curator")
    expect(bncc!.provenance.verifiedAt).toBeDefined()
  })

  it("Source livro Dante permanece unverified (curador não confirmou texto)", async () => {
    const { registry } = await fixture()
    const dante = await registry.get("pnld-dante-matematica-vol1")
    expect(dante!.provenance.status).toBe("unverified")
  })

  it("todas as questões apontam pra uma Source registrada", async () => {
    const { registry, bank } = await fixture()
    const all = await bank.findBy({})
    for (const q of all) {
      if (q.sourceId) {
        expect(await registry.has(q.sourceId)).toBe(true)
      }
    }
  })
})

describe("L. dataset — retrieval por metadata", () => {
  it("findBy topic=funcao-quadratica devolve as 6", async () => {
    const { bank } = await fixture()
    const rows = await bank.findBy({ topic: "funcao-quadratica" })
    expect(rows.length).toBe(6)
  })

  it("findBy questionType=diagnostic devolve 2", async () => {
    const { bank } = await fixture()
    const rows = await bank.findBy({ questionType: "diagnostic" })
    expect(rows.length).toBe(2)
  })

  it("findBy questionType=practice devolve 3", async () => {
    const { bank } = await fixture()
    const rows = await bank.findBy({ questionType: "practice" })
    expect(rows.length).toBe(3)
  })

  it("findBy questionType=verification devolve 1", async () => {
    const { bank } = await fixture()
    const rows = await bank.findBy({ questionType: "verification" })
    expect(rows.length).toBe(1)
  })

  it("findBy phase=verify devolve a verification", async () => {
    const { bank } = await fixture()
    const rows = await bank.findBy({ phase: "verify" })
    expect(rows.map((q) => q.id)).toEqual(["q-quadratica-verify-01"])
  })
})

describe("Método Atenis — critério final da Fase 2A", () => {
  it("selector determinístico escolhe a diagnostic mais fácil pra diagnose", async () => {
    const { bank } = await fixture()
    const selector = new DeterministicQuestionSelector(bank)
    const q = await selector.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "diagnose",
    })
    expect(q).not.toBeNull()
    expect(q!.questionType).toBe("diagnostic")
    expect(q!.difficulty).toBe("easy")
  })

  it("selector escolhe a verification pra verify", async () => {
    const { bank } = await fixture()
    const selector = new DeterministicQuestionSelector(bank)
    const q = await selector.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "verify",
    })
    expect(q!.id).toBe("q-quadratica-verify-01")
    expect(q!.difficulty).toBe("hard")
  })

  it("uma questão exemplar entrega TODA a metadata prometida", async () => {
    const { bank } = await fixture()
    const q = await bank.getById("q-quadratica-diagnostic-01")
    expect(q).not.toBeNull()
    // Para quem serve
    expect(q!.subject).toBe("matematica")
    expect(q!.grade).toBe("EM01")
    expect(q!.schoolStage).toBe("high")
    // Qual habilidade / tópico
    expect(q!.skill).toBe("EM13MAT302")
    expect(q!.topic).toBe("funcao-quadratica")
    // Que tipo de intervenção
    expect(q!.questionType).toBe("diagnostic")
    expect(q!.usableInPhases).toContain("diagnose")
    // Resposta esperada com estrutura
    expect(q!.expectedAnswer.kind).toBe("algebraic")
    // Erros comuns catalogados
    expect(q!.commonErrors.length).toBeGreaterThan(0)
    expect(q!.commonErrors[0].code).toBeDefined()
    // Fonte
    expect(q!.sourceId).toBe("bncc-em13mat302")
  })
})

describe("consistência estatística do dataset", () => {
  it("todas as questões têm status=verified (dataset curado)", () => {
    for (const q of QUADRATICA_QUESTIONS) {
      expect(q.status).toBe("verified")
    }
  })
  it("todas as questões apontam pra sourceId ou têm authorNote", () => {
    for (const q of QUADRATICA_QUESTIONS) {
      expect(q.sourceId || q.authorNote).toBeTruthy()
    }
  })
  it("Sources incluem pelo menos uma verified", () => {
    const verified = QUADRATICA_SOURCES.filter(
      (s) => s.provenance.status === "verified",
    )
    expect(verified.length).toBeGreaterThan(0)
  })
})
