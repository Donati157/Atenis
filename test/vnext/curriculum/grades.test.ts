// test/vnext/curriculum/grades.test.ts

import { describe, it, expect } from "vitest"
import {
  isHigh,
  isMiddle,
  listGrades,
  parseGradeCode,
  schoolStageOf,
} from "../../../lib/vnext/curriculum/grades"

describe("parseGradeCode — canonicals", () => {
  it("6, 7, 8, 9 (EF)", () => {
    expect(parseGradeCode("6")?.schoolStage).toBe("middle")
    expect(parseGradeCode("9")?.schoolStage).toBe("middle")
  })

  it("EM01, EM02, EM03 (EM)", () => {
    expect(parseGradeCode("EM01")?.schoolStage).toBe("high")
    expect(parseGradeCode("EM03")?.schoolStage).toBe("high")
  })

  it("desconhecidos → null", () => {
    expect(parseGradeCode("10")).toBeNull()
    expect(parseGradeCode("EM04")).toBeNull()
    expect(parseGradeCode("")).toBeNull()
  })
})

describe("parseGradeCode — aliases", () => {
  it('"1", "1EM", "1º" → EM01', () => {
    expect(parseGradeCode("1")?.code).toBe("EM01")
    expect(parseGradeCode("1EM")?.code).toBe("EM01")
    expect(parseGradeCode("1º")?.code).toBe("EM01")
  })

  it('"6º", "9º" → 6, 9', () => {
    expect(parseGradeCode("6º")?.code).toBe("6")
    expect(parseGradeCode("9º")?.code).toBe("9")
  })
})

describe("helpers", () => {
  it("isMiddle / isHigh", () => {
    expect(isMiddle("8")).toBe(true)
    expect(isHigh("8")).toBe(false)
    expect(isHigh("EM02")).toBe(true)
    expect(isMiddle("EM02")).toBe(false)
  })

  it("schoolStageOf null quando desconhecido", () => {
    expect(schoolStageOf("bogus")).toBeNull()
  })
})

describe("listGrades — ordem cronológica", () => {
  it("percorre 6→EM03 em order crescente", () => {
    const codes = listGrades().map((g) => g.code)
    expect(codes).toEqual(["6", "7", "8", "9", "EM01", "EM02", "EM03"])
    const orders = listGrades().map((g) => g.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})
