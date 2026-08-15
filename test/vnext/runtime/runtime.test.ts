// test/vnext/runtime/runtime.test.ts
//
// E2E do Runtime rodando o cenário "quadratic-adapt-then-succeed":
//   Aluno: "Não entendo função quadrática."
//     → diagnose → aguarda
//   Aluno: start
//     → teach(worked_example) [primeira geração fraca, refine, ok]
//   (auto) → practice → aguarda
//   Aluno: answer(correct=false, strategy=worked_example)
//     → evaluate (internal, marca fail)
//   (auto) → adapt (internal, escolhe analogy)
//   (auto) → teach(analogy)
//   (auto) → practice → aguarda
//   Aluno: answer(correct=true, strategy=analogy)
//     → evaluate (mastery sobe pra emerging)
//   (auto) → review (mastery ainda não dá pra verify direto)
//   (auto) → verify → aguarda
//   Aluno: answer(correct=true, strategy=analogy)
//     → evaluate (verify success → mastery pula pra developing e streak++)
//   (auto) → ready
//
// Critérios cobertos: G (refine consumido pelo runtime), J (state
// atualiza), K (strategy registrada), F (tentativa boa avança pra verify),
// D (falha vai pra adapt), E (adapt vira teach).

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"
import type { RuntimeInput } from "../../../lib/vnext/runtime/types"

function newRuntime() {
  const mock = new MockProvider()
  registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
  const gateway = createGateway()
  gateway.register(mock)
  const store = new InMemoryLearningStore()
  const runtime = new Runtime({
    gateway,
    engine: new MethodEngine(),
    store,
    clock: new FakeClock(),
    ids: new CounterIdGenerator(),
    criticAnalyze: (r) => analyze(r),
  })
  return { runtime, store }
}

async function tickChain(
  runtime: Runtime,
  studentId: string,
  topic: string,
  turns: Array<{
    message?: string
    event?: RuntimeInput["studentEvent"]
    label: string
  }>,
) {
  const outputs: Awaited<ReturnType<Runtime["tick"]>>[] = []
  for (const turn of turns) {
    // Cada turno pode ser 1 tick ou vários (avanço automático até phase
    // que aguarda input ou terminal). Fazemos loop até isso acontecer,
    // sem passar studentEvent nos ticks internos.
    let firstOfTurn = true
    while (true) {
      const output = await runtime.tick({
        studentId,
        topic,
        message: firstOfTurn ? (turn.message ?? "") : "",
        studentEvent: firstOfTurn ? (turn.event ?? null) : null,
        // Fase 2A: sem evaluator injetado nestes testes → precisa
        // marcar explícito que o test confia em event.correct.
        trustedEvaluation: true,
      })
      outputs.push(output)
      firstOfTurn = false
      if (output.awaitingStudentInput || output.aborted) break
      if (
        output.nextExpectedPhase === "ready" ||
        output.nextExpectedPhase === "abort"
      ) {
        // Executa o tick terminal pra registrar transição pra ready/abort.
        const terminalOut = await runtime.tick({
          studentId,
          topic,
          message: "",
          studentEvent: null,
        })
        outputs.push(terminalOut)
        break
      }
    }
  }
  return outputs
}

describe("Runtime E2E — quadratic-adapt-then-succeed", () => {
  it("aluno passa pela jornada completa e termina em ready", async () => {
    const { runtime, store } = newRuntime()
    const outputs = await tickChain(runtime, "s1", "quadratic", [
      { label: "opening", message: "Não entendo função quadrática." },
      { label: "student-says-start", event: { kind: "start" } },
      {
        label: "student-answers-wrong",
        event: {
          kind: "answer",
          correct: false,
          strategyUsed: "worked_example",
        },
      },
      {
        label: "student-answers-right-with-analogy",
        event: { kind: "answer", correct: true, strategyUsed: "analogy" },
      },
      {
        label: "student-passes-verify",
        event: { kind: "answer", correct: true, strategyUsed: "analogy" },
      },
    ])

    // Sequência de phases executadas deve incluir os marcos-chave.
    const phasesExecuted = outputs.map((o) => o.executedPhase)
    // Início com diagnose
    expect(phasesExecuted[0]).toBe("diagnose")
    // Termina em ready
    expect(phasesExecuted[phasesExecuted.length - 1]).toBe("ready")
    // Passou por teach com duas strategies distintas
    const teachOutputs = outputs.filter((o) => o.executedPhase === "teach")
    const teachStrategies = teachOutputs.map((o) => o.strategy)
    expect(teachStrategies).toContain("worked_example")
    expect(teachStrategies).toContain("analogy")
    // Passou por adapt
    expect(phasesExecuted).toContain("adapt")
    // Passou por verify antes de ready
    expect(phasesExecuted).toContain("verify")

    // Learning state final
    const finalState = await store.load("s1", "quadratic")
    expect(finalState).not.toBeNull()
    // Registra strategyEffectiveness pra ambas
    const strats = finalState!.strategyEffectiveness.map((s) => s.strategy)
    expect(strats).toContain("worked_example")
    expect(strats).toContain("analogy")
    // worked_example teve 1 falha, analogy teve ≥1 sucesso
    const we = finalState!.strategyEffectiveness.find(
      (s) => s.strategy === "worked_example",
    )!
    const an = finalState!.strategyEffectiveness.find(
      (s) => s.strategy === "analogy",
    )!
    expect(we.successes).toBe(0)
    expect(we.tries).toBeGreaterThanOrEqual(1)
    expect(an.successes).toBeGreaterThanOrEqual(1)
    // Mastery final é developing ou secure
    expect(["developing", "secure"]).toContain(finalState!.mastery)
    // Phase final ready
    expect(finalState!.currentMethodPhase).toBe("ready")
  })

  it("Runtime consome refine do Critic (G): teach requer 2 attempts na primeira execução", async () => {
    const { runtime } = newRuntime()
    const outputs = await tickChain(runtime, "s2", "quadratic", [
      { label: "opening", message: "Não entendo função quadrática." },
      { label: "student-says-start", event: { kind: "start" } },
    ])
    // Depois da diagnose e start, o Runtime executou teach.
    const teachOutputs = outputs.filter((o) => o.executedPhase === "teach")
    expect(teachOutputs.length).toBeGreaterThan(0)
    const firstTeach = teachOutputs[0]
    // A fixture teach primeira tentativa é fraca → refine → segunda ok.
    expect(firstTeach.refinementAttempts).toBe(2)
    expect(firstTeach.criticReport?.recommendedAction).toBe("accept")
  })
})

describe("Runtime — reject encerra o topic (H)", () => {
  it("fixture com BROKEN_REFERENCE → abort=critic-reject", async () => {
    const mock = new MockProvider()
    // Só substitui a fixture do diagnose por uma quebrada — o restante do
    // cenário nem chega a rodar.
    mock.registerMatcher(
      (i) => i.useCase === "atenis.diagnose",
      {
        body: {
          kind: "object",
          value: {
            primaryTakeaway: "ok",
            nextStep: "?",
            sources: [
              {
                id: "s1",
                type: "textbook",
                title: "livro",
                authorityTier: "textbook",
                retrievedAt: "2026-08-11T14:00:00.000Z",
                provenance: {
                  status: "unverified",
                  verificationMethod: "none",
                },
              },
            ],
            evidences: [],
            claims: [
              {
                id: "c1",
                text: "x",
                type: "fact",
                assertionLevel: "asserted",
                evidenceIds: ["e-fantasma"], // não existe
              },
            ],
            analyses: [],
            reviews: [],
            detectedConflicts: [],
            meta: {
              generatedAt: "2026-08-11T14:00:00.000Z",
              modelName: "mock-v1",
              turnId: "t-1",
            },
          },
        },
      },
      "diagnose broken ref",
    )
    const gateway = createGateway()
    gateway.register(mock)
    const runtime = new Runtime({
      gateway,
      engine: new MethodEngine(),
      store: new InMemoryLearningStore(),
      clock: new FakeClock(),
      ids: new CounterIdGenerator(),
      criticAnalyze: (r) => analyze(r),
    })
    const out = await runtime.tick({
      studentId: "s3",
      topic: "quadratic",
      message: "?",
    })
    expect(out.aborted?.reason).toBe("critic-reject")
    expect(out.aborted?.issueCodes).toContain("BROKEN_REFERENCE")
    expect(out.state.currentMethodPhase).toBe("abort")
  })
})

describe("Runtime — provider error (M)", () => {
  it("fixture kind=error → abort=provider-error", async () => {
    const mock = new MockProvider()
    mock.registerMatcher(
      (i) => i.useCase === "atenis.diagnose",
      {
        body: {
          kind: "error",
          error: { name: "TimeoutError", message: "read ETIMEDOUT" },
        },
      },
      "diagnose times out",
    )
    const gateway = createGateway()
    gateway.register(mock)
    const runtime = new Runtime({
      gateway,
      engine: new MethodEngine(),
      store: new InMemoryLearningStore(),
      clock: new FakeClock(),
      ids: new CounterIdGenerator(),
      criticAnalyze: (r) => analyze(r),
    })
    const out = await runtime.tick({
      studentId: "s4",
      topic: "quadratic",
      message: "?",
    })
    expect(out.aborted?.reason).toBe("provider-error")
    expect(out.aborted?.detail).toContain("ETIMEDOUT")
  })
})
