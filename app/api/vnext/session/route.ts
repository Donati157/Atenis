// app/api/vnext/session/route.ts
//
// Endpoint de PRODUÇÃO do Runtime pedagógico vNext — conectado à UI
// principal em /dashboard/estudar. Diferente do /api/vnext/tutor
// (dev-only, MockProvider + fixtures), este usa OpenAI direto
// (gpt-4o-mini) e exige autenticação Supabase.
//
// Persistência: LearningTopicState é STATELESS entre requests do server.
// O cliente mantém `priorState` no estado React e reenvía a cada tick —
// server não precisa de DB pra Runtime funcionar. Persistência real
// (SupabaseLearningStore) fica pra fase futura.
//
// Provider: OpenAIProvider ativado. Requer OPENAI_API_KEY no ambiente.
// Rota falha graciosamente com 503 se a chave não estiver presente.
//
// Anti-vazamento: response é o `RuntimeOutput` completo, mas
// `question-brief` (que o Critic aplica na composição do prompt) já
// garante que gabaritos nunca vazam ao modelo. UI consumidora exibe
// apenas campos apresentáveis.

import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { SystemClock } from "@/lib/vnext/clock"
import { CounterIdGenerator } from "@/lib/vnext/ids"
import { MethodEngine } from "@/lib/vnext/engine"
import { InMemoryLearningStore } from "@/lib/vnext/learning/store"
import { createGateway } from "@/lib/vnext/gateway"
import { OpenAIProvider } from "@/lib/vnext/gateway/providers/openai"
import { analyze } from "@/lib/vnext/critic"
import { Runtime } from "@/lib/vnext/runtime"
import {
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
} from "@/lib/vnext/questions"
import { InMemorySourceRegistry } from "@/lib/vnext/knowledge"
import { InMemoryMisconceptionRegistry } from "@/lib/vnext/misconceptions"
import { loadQuadraticaDataset } from "@/lib/vnext/datasets/matematica-funcao-quadratica"
import type { LearningTopicState } from "@/lib/vnext/learning/types"

export const maxDuration = 60
export const dynamic = "force-dynamic"

const contextSchema = z.object({
  subject: z.string().min(1).max(60),
  grade: z.string().min(1).max(16).optional(),
  schoolStage: z.string().min(1).max(40).optional(),
})

const studentEventSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("start") }),
  z.object({ kind: z.literal("confused"), text: z.string().max(4000).optional() }),
  z.object({
    kind: z.literal("answer"),
    correct: z.boolean(),
    strategyUsed: z.string().min(1).max(60),
    text: z.string().max(8000).optional(),
  }),
  z.object({ kind: z.literal("self-report-ready") }),
])

const requestSchema = z.object({
  topic: z.string().min(1).max(128),
  message: z.string().max(8000).default(""),
  studentEvent: studentEventSchema.nullish(),
  context: contextSchema,
  // priorState: o cliente reenvía o state do último tick pra manter
  // continuidade sem persistência server-side.
  priorState: z.record(z.string(), z.unknown()).nullish(),
})

export async function POST(request: Request) {
  // Auth Supabase — só usuário logado.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // OpenAI key presence check — falha claro se faltar (evita 500 opaco).
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "openai-key-missing" },
      { status: 503 },
    )
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

  try {
    const output = await runTick(user.id, parsed.data)
    return NextResponse.json({ output })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "runtime-error", message },
      { status: 500 },
    )
  }
}

interface TickInput {
  topic: string
  message: string
  studentEvent?: z.infer<typeof studentEventSchema> | null
  context: z.infer<typeof contextSchema>
  priorState?: Record<string, unknown> | null
}

async function runTick(studentId: string, input: TickInput) {
  const gateway = createGateway({ defaultProviderId: "openai" })
  gateway.register(
    new OpenAIProvider({ modelId: "gpt-4o-mini", activated: true }),
  )

  const sourceRegistry = new InMemorySourceRegistry()
  const misconceptionRegistry = new InMemoryMisconceptionRegistry()
  const bank = new InMemoryQuestionBank(sourceRegistry, misconceptionRegistry)
  // Dataset único hoje: quadrática. Futuras matérias vêm por
  // context.subject → loader diferente. Mantido simples por enquanto.
  await loadQuadraticaDataset(sourceRegistry, bank, misconceptionRegistry)
  const selector = new DeterministicQuestionSelector(bank)

  const runtime = new Runtime({
    gateway,
    engine: new MethodEngine(),
    store: new InMemoryLearningStore(),
    clock: new SystemClock(),
    ids: new CounterIdGenerator(),
    criticAnalyze: (r) => analyze(r),
    questionBank: bank,
    questionSelector: selector,
    requireQuestion: true,
    misconceptionRegistry,
  })

  return runtime.tick({
    studentId,
    topic: input.topic,
    message: input.message,
    studentEvent: (input.studentEvent ?? null) as never,
    context: input.context as never,
    priorState: (input.priorState ?? undefined) as LearningTopicState | undefined,
  })
}
