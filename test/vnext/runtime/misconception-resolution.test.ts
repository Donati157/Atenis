// test/vnext/runtime/misconception-resolution.test.ts
//
// G. 1 acerto NÃO marca misconception como provisionally-resolved.
// H. 2 acertos independentes marcam provisionally-resolved.

import { describe, it, expect } from "vitest"
import {
  activeMisconceptions,
  misconceptionStatus,
  recordMisconception,
  resolveMisconceptionsFromQuestion,
} from "../../../lib/vnext/learning/updates"
import { newTopicState } from "../../../lib/vnext/learning/types"

const AT_1 = "2026-08-11T14:00:00.000Z"
const AT_2 = "2026-08-11T14:00:10.000Z"
const AT_3 = "2026-08-11T14:00:20.000Z"

function seed() {
  return newTopicState({
    studentId: "s1",
    topic: "funcao-quadratica",
    createdAt: AT_1,
  })
}

describe("G. um acerto sozinho não resolve", () => {
  it("attempts=1, resolvedEvidence=1 → improving (não provisionally-resolved)", () => {
    let state = seed()
    state = recordMisconception(state, "sign-confusion-b", AT_1)
    state = resolveMisconceptionsFromQuestion(
      state,
      ["sign-confusion-b"],
      AT_2,
    )
    const m = state.misconceptions[0]
    expect(m.attempts).toBe(1)
    expect(m.resolvedEvidence).toBe(1)
    expect(misconceptionStatus(m)).toBe("improving")
    // Continua ATIVA (não é provisionally-resolved)
    expect(activeMisconceptions(state)).toContain("sign-confusion-b")
  })
})

describe("H. dois acertos independentes → provisionally-resolved", () => {
  it("attempts=1, resolvedEvidence=2 → provisionally-resolved", () => {
    let state = seed()
    state = recordMisconception(state, "sign-confusion-b", AT_1)
    state = resolveMisconceptionsFromQuestion(
      state,
      ["sign-confusion-b"],
      AT_2,
    )
    state = resolveMisconceptionsFromQuestion(
      state,
      ["sign-confusion-b"],
      AT_3,
    )
    const m = state.misconceptions[0]
    expect(m.resolvedEvidence).toBe(2)
    expect(misconceptionStatus(m)).toBe("provisionally-resolved")
    // NÃO fica mais na lista de ativas
    expect(activeMisconceptions(state)).not.toContain("sign-confusion-b")
  })

  it("erro DEPOIS de resolver → volta pra improving/active", () => {
    let state = seed()
    // erra, acerta 2x → provisionally-resolved
    state = recordMisconception(state, "sign-confusion-b", AT_1)
    state = resolveMisconceptionsFromQuestion(
      state,
      ["sign-confusion-b"],
      AT_2,
    )
    state = resolveMisconceptionsFromQuestion(
      state,
      ["sign-confusion-b"],
      AT_3,
    )
    // Agora erra de novo
    state = recordMisconception(state, "sign-confusion-b", AT_3)
    const m = state.misconceptions[0]
    // attempts=2, resolvedEvidence=2 → attempts NÃO > resolvedEvidence, mas
    // NÃO é mais > → status volta pra improving (resolvedEvidence>=1 e
    // NÃO satisfaz resolvedEvidence >= attempts+1)
    // Regra: provisionally-resolved requer resolvedEvidence >= 2 && >= attempts
    // 2 >= 2 → still provisionally-resolved. Erro precisa dominar → outro erro extra.
    // Aqui: attempts=2, resolvedEvidence=2 → 2 >= 2 → provisionally.
    expect(misconceptionStatus(m)).toBe("provisionally-resolved")

    // Um SEGUNDO erro (attempts=3, resolvedEvidence=2) → improving
    state = recordMisconception(state, "sign-confusion-b", AT_3)
    const m2 = state.misconceptions[0]
    expect(m2.attempts).toBe(3)
    expect(m2.resolvedEvidence).toBe(2)
    expect(misconceptionStatus(m2)).toBe("improving")
  })
})

describe("mesma questão contada 2× NÃO conta como 2 evidências (via Runtime)", () => {
  // Documenta convenção — o teste real está no Runtime que usa
  // answeredSuccessfully pra proteger. Aqui só documento a pura.
  it("resolveMisconceptionsFromQuestion incrementa sempre — Runtime que dedupe", () => {
    let state = seed()
    state = recordMisconception(state, "x", AT_1)
    state = resolveMisconceptionsFromQuestion(state, ["x"], AT_2)
    state = resolveMisconceptionsFromQuestion(state, ["x"], AT_2)
    // sem proteção, ficaria 2. A dedupe vive no Runtime.
    expect(state.misconceptions[0].resolvedEvidence).toBe(2)
  })
})
