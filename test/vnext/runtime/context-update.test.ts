// test/vnext/runtime/context-update.test.ts
//
// A. contexto inicial é salvo.
// B. mesmo contexto permanece estável (sem trace de mudança).
// C. mudança legítima de contexto atualiza state + trace explícito.
// D. seleção passa a usar o novo contexto.

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { InMemorySourceRegistry } from "../../../lib/vnext/knowledge"
import { InMemoryMisconceptionRegistry } from "../../../lib/vnext/misconceptions"
import {
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
} from "../../../lib/vnext/questions"
import { loadQuadraticaDataset } from "../../../lib/vnext/datasets/matematica-funcao-quadratica"
import { loadConcordanciaDataset } from "../../../lib/vnext/datasets/portugues-concordancia-verbal"
import { registerMultiAdaptFixtures } from "../../../lib/vnext/scenarios/multi-adapt-then-socratic"

async function makeRuntime() {
  const mock = new MockProvider()
  registerMultiAdaptFixtures(mock)
  const gateway = createGateway()
  gateway.register(mock)
  const sreg = new InMemorySourceRegistry()
  const mreg = new InMemoryMisconceptionRegistry()
  const bank = new InMemoryQuestionBank(sreg, mreg)
  // Carrega os dois datasets pra que mudança de contexto vá pra outra Q.
  await loadQuadraticaDataset(sreg, bank, mreg)
  await loadConcordanciaDataset(sreg, bank, mreg)
  const selector = new DeterministicQuestionSelector(bank)
  const store = new InMemoryLearningStore()
  const runtime = new Runtime({
    gateway,
    engine: new MethodEngine(),
    store,
    clock: new FakeClock(),
    ids: new CounterIdGenerator(),
    criticAnalyze: (r) => analyze(r),
    questionBank: bank,
    questionSelector: selector,
    misconceptionRegistry: mreg,
    requireQuestion: true,
  })
  return { runtime, store }
}

const MATH_CTX = {
  subject: "matematica",
  grade: "EM01" as const,
  schoolStage: "high" as const,
}
const PORT_CTX = {
  subject: "portugues",
  grade: "9" as const,
  schoolStage: "middle" as const,
}

describe("A. context inicial é salvo", () => {
  it("primeira tick com context grava em state.context", async () => {
    const { runtime, store } = await makeRuntime()
    const out = await runtime.tick({
      studentId: "s1",
      topic: "funcao-quadratica",
      message: "?",
      context: MATH_CTX,
    })
    expect(out.state.context).toEqual(MATH_CTX)
    expect(
      out.trace.some((t) => t.step === "runtime.context.initialized"),
    ).toBe(true)
    const loaded = await store.load("s1", "funcao-quadratica")
    expect(loaded!.context).toEqual(MATH_CTX)
  })
})

describe("B. mesmo contexto permanece estável (sem trace de mudança)", () => {
  it("segunda tick com mesmo context NÃO gera runtime.context.changed", async () => {
    const { runtime } = await makeRuntime()
    const studentId = "s2"
    const topic = "funcao-quadratica"
    await runtime.tick({ studentId, topic, message: "?", context: MATH_CTX })
    const second = await runtime.tick({
      studentId,
      topic,
      message: "",
      context: MATH_CTX,
    })
    expect(
      second.trace.some((t) => t.step === "runtime.context.changed"),
    ).toBe(false)
    // O context permanece igual.
    expect(second.state.context).toEqual(MATH_CTX)
  })
})

describe("C. mudança legítima de contexto atualiza state", () => {
  it("passar context DIFERENTE aplica update + trace runtime.context.changed", async () => {
    const { runtime, store } = await makeRuntime()
    const studentId = "s3"
    const topic = "funcao-quadratica"
    await runtime.tick({ studentId, topic, message: "?", context: MATH_CTX })
    const changed = await runtime.tick({
      studentId,
      topic,
      message: "",
      context: PORT_CTX,
    })
    expect(
      changed.trace.some((t) => t.step === "runtime.context.changed"),
    ).toBe(true)
    expect(changed.state.context).toEqual(PORT_CTX)
    const loaded = await store.load(studentId, topic)
    expect(loaded!.context).toEqual(PORT_CTX)
  })
})

describe("D. seleção passa a usar o novo contexto", () => {
  it("Após mudar context de matematica pra portugues, próxima seleção pega Q de portugues", async () => {
    const { runtime } = await makeRuntime()
    const studentId = "s4"
    // Começa com math, topic mate. Primeiro tick seleciona math Q.
    const first = await runtime.tick({
      studentId,
      topic: "funcao-quadratica",
      message: "?",
      context: MATH_CTX,
    })
    expect(first.selectedQuestion?.subject).toBe("matematica")

    // Agora começa um TOPIC diferente com contexto pt. State novo pra
    // esse (studentId, topic), então context vem do input.
    const second = await runtime.tick({
      studentId,
      topic: "concordancia-verbal",
      message: "?",
      context: PORT_CTX,
    })
    expect(second.selectedQuestion?.subject).toBe("portugues")
    expect(second.selectedQuestion?.grade).toBe("9")
  })
})
