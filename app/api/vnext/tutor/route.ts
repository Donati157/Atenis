// app/api/vnext/tutor/route.ts
//
// Endpoint DEV-ONLY do Runtime vNext.
//
// Isolado do resto do produto: não toca `/api/chat`, não toca Supabase,
// não usa Provider real. Serve pra provar o ciclo end-to-end com
// MockProvider + fixtures determinísticas.
//
// Protegido por env var: só responde 200 se `ATENIS_VNEXT_TUTOR_ENABLED`
// = "true". Em produção sem essa flag, devolve 404 pra não expor rota
// dev acidentalmente.

import { NextResponse } from "next/server"
import { z } from "zod"
import { SystemClock } from "@/lib/vnext/clock"
import { CounterIdGenerator } from "@/lib/vnext/ids"
import { MethodEngine } from "@/lib/vnext/engine"
import { InMemoryLearningStore } from "@/lib/vnext/learning/store"
import { createGateway } from "@/lib/vnext/gateway"
import { MockProvider } from "@/lib/vnext/gateway/providers/mock"
import { analyze } from "@/lib/vnext/critic"
import { Runtime } from "@/lib/vnext/runtime"
import { registerScenarioFixtures } from "@/lib/vnext/scenarios/quadratic-adapt-then-succeed"

export const maxDuration = 30
export const dynamic = "force-dynamic"

const requestSchema = z.object({
  studentId: z.string().min(1).max(128),
  topic: z.string().min(1).max(128),
  message: z.string().max(4000).default(""),
  studentEvent: z
    .union([
      z.object({ kind: z.literal("start") }),
      z.object({ kind: z.literal("confused"), text: z.string().optional() }),
      z.object({
        kind: z.literal("answer"),
        correct: z.boolean(),
        strategyUsed: z.string(),
        text: z.string().optional(),
      }),
      z.object({ kind: z.literal("self-report-ready") }),
    ])
    .nullish(),
  // Nome do cenário de fixtures pré-registrado.
  scenario: z
    .enum(["quadratic-adapt-then-succeed"])
    .default("quadratic-adapt-then-succeed"),
})

export async function POST(request: Request) {
  if (process.env.ATENIS_VNEXT_TUTOR_ENABLED !== "true") {
    return NextResponse.json({ error: "not-enabled" }, { status: 404 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid-input", issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const output = await runTick(parsed.data)
  return NextResponse.json({ output })
}

// Não exportado (Next 15 só aceita HTTP handlers em route.ts). Testes
// chamam POST direto com um Request sintético.
async function runTick(
  input: z.infer<typeof requestSchema>,
): Promise<unknown> {
  const mock = new MockProvider()
  registerScenarioFixtures(mock, input.scenario)
  const gateway = createGateway()
  gateway.register(mock)
  const runtime = new Runtime({
    gateway,
    engine: new MethodEngine(),
    store: new InMemoryLearningStore(),
    clock: new SystemClock(),
    ids: new CounterIdGenerator(),
    criticAnalyze: (r) => analyze(r),
  })
  return runtime.tick({
    studentId: input.studentId,
    topic: input.topic,
    message: input.message ?? "",
    studentEvent: (input.studentEvent ?? null) as never,
  })
}
