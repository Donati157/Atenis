// test/vnext/runtime/prompt/grade-context.test.ts

import { describe, it, expect } from "vitest"
import { buildGradeContext } from "../../../../lib/vnext/runtime/prompt/grade-context"

describe("buildGradeContext", () => {
  it("context null → bloco mínimo com aviso 'não informada'", () => {
    const g = buildGradeContext(null)
    expect(g).toMatch(/não informad/i)
    expect(g).toContain("REGRA ABSOLUTA")
  })

  it("EM01 → guidance de início do EM", () => {
    const g = buildGradeContext({
      subject: "matematica",
      grade: "EM01",
      schoolStage: "high",
    })
    expect(g).toContain("EM01")
    expect(g).toMatch(/início do Ensino Médio|1º ano.*Ensino Médio/)
  })

  it("EM03 → guidance de 3º ano com interdisciplinaridade", () => {
    const g = buildGradeContext({
      subject: "matematica",
      grade: "EM03",
      schoolStage: "high",
    })
    expect(g).toContain("EM03")
    expect(g).toMatch(/interdisciplinaridade/)
  })

  it("6/7/8/9 → guidance de EF II", () => {
    for (const grade of ["6", "7", "8", "9"]) {
      const g = buildGradeContext({
        subject: "matematica",
        grade,
        schoolStage: "middle",
      })
      expect(g).toContain(grade)
      expect(g).toMatch(/Ensino Fundamental/)
    }
  })

  it("grade desconhecida → cai em 'não reconhecida' sem lançar", () => {
    const g = buildGradeContext({
      subject: "matematica",
      grade: "ZZZ999",
      schoolStage: "middle",
    })
    expect(g).toMatch(/não reconhecida/)
  })

  it("SEMPRE inclui REGRA ABSOLUTA de não rotular ENEM/Fuvest/AP", () => {
    const g = buildGradeContext({
      subject: "matematica",
      grade: "EM01",
      schoolStage: "high",
    })
    expect(g).toContain("REGRA ABSOLUTA")
    expect(g).toMatch(/ENEM.*Fuvest.*AP|Simulado ENEM/)
  })

  it("expõe subject do contexto", () => {
    const g = buildGradeContext({
      subject: "portugues",
      grade: "EM02",
      schoolStage: "high",
    })
    expect(g).toContain("portugues")
  })
})
