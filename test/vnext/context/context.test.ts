// test/vnext/context/context.test.ts

import { describe, it, expect } from "vitest"
import { educationalContextSchema } from "../../../lib/vnext/context"

describe("EducationalContext schema", () => {
  it("aceita context completo", () => {
    const ok = {
      subject: "matematica",
      grade: "EM01",
      schoolStage: "high",
      skill: "EM13MAT302",
    }
    expect(educationalContextSchema.safeParse(ok).success).toBe(true)
  })

  it("aceita sem skill", () => {
    const ok = { subject: "portugues", grade: "9", schoolStage: "middle" }
    expect(educationalContextSchema.safeParse(ok).success).toBe(true)
  })

  it("rejeita subject vazio", () => {
    expect(
      educationalContextSchema.safeParse({
        subject: "",
        grade: "EM01",
        schoolStage: "high",
      }).success,
    ).toBe(false)
  })

  it("NÃO tem topic (topic vive em RuntimeInput)", () => {
    const shape = educationalContextSchema.shape
    expect("topic" in shape).toBe(false)
  })
})
