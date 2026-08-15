// test/vnext/smoke-real/runtime-openai.smoke.test.ts
//
// SMOKE TEST REAL — runtime.tick contra OpenAI direto.
//
// Este é o teste de INTEGRAÇÃO PEDAGÓGICA (não só do adapter). Cobre:
//   - AIGateway (único provider registrado = OpenAIProvider ativado)
//   - Runtime.tick (orquestrador completo)
//   - MethodEngine.decideNext (primeira interação → diagnose)
//   - selectQuestionForPhase → InMemoryQuestionBank com dataset REAL
//   - generatePhaseResponse → gateway.structured → OpenAI
//   - Critic (analyze) sobre `structuredResponseSchema` epistêmico
//     (regras da Fase 0.1: schema-integrity, evidence-coverage,
//      source-authority, source-provenance, factual-support,
//      analysis-not-repetition, source-conflict, factual-validator-hook)
//   - Learning state atualizado (pendingQuestionId, generativeTurns...)
//
// NÃO cobre:
//   - Evaluator (evaluator=undefined; trustedEvaluation=true seria pra tick 2+)
//   - Adaptação/multi-tick (só 1 tick nesta rodada FOCUSED)
//   - Refine loop (só ativa se Critic devolver refine — não garantido)
//   - Persistência real (InMemoryLearningStore)
//
// Gates:
//   - ATENIS_SMOKE_ENABLED=true
//   - OPENAI_API_KEY setada (não vazia)
//
// Registra APENAS metadata — NUNCA prompt/response literal.

import { describe, it, expect } from "vitest"
import { createGateway } from "../../../lib/vnext/gateway"
import type { OperationRecord } from "../../../lib/vnext/gateway/telemetry"
import { OpenAIProvider } from "../../../lib/vnext/gateway/providers/openai"
import { analyze } from "../../../lib/vnext/critic"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { InMemorySourceRegistry } from "../../../lib/vnext/knowledge"
import { InMemoryMisconceptionRegistry } from "../../../lib/vnext/misconceptions"
import {
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
} from "../../../lib/vnext/questions"
import { loadQuadraticaDataset } from "../../../lib/vnext/datasets/matematica-funcao-quadratica"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"

const SMOKE_ENABLED = process.env.ATENIS_SMOKE_ENABLED === "true"
const HAS_OPENAI_KEY = Boolean(process.env.OPENAI_API_KEY?.trim())
const MODEL_ID = process.env.ATENIS_SMOKE_MODEL_ID ?? "gpt-4o-mini"

// Pricing tabela — proxy pra custo. Se modelId mudar, adicionar aqui.
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
}

describe.runIf(SMOKE_ENABLED && HAS_OPENAI_KEY)(
  "SMOKE: runtime.tick REAL contra OpenAI (Focused)",
  () => {
    it(
      `runtime.tick(diagnose) contra ${MODEL_ID} produz StructuredResponse válida + Critic accept/refine`,
      { timeout: 90_000 },
      async () => {
        // -----------------------------------------------------------
        // Setup: TUDO real exceto Evaluator (=undefined) e persistência
        // (InMemory). Nenhum mock de provider/schema/critic.
        // -----------------------------------------------------------
        const usageRecords: OperationRecord[] = []
        const gateway = createGateway({
          defaultProviderId: "openai",
          telemetry: { onOperation: (r) => usageRecords.push(r) },
        })
        gateway.register(
          new OpenAIProvider({ modelId: MODEL_ID, activated: true }),
        )

        // Dataset REAL do projeto
        const sourceRegistry = new InMemorySourceRegistry()
        const misconceptionRegistry = new InMemoryMisconceptionRegistry()
        const bank = new InMemoryQuestionBank(
          sourceRegistry,
          misconceptionRegistry,
        )
        await loadQuadraticaDataset(sourceRegistry, bank, misconceptionRegistry)
        const selector = new DeterministicQuestionSelector(bank)

        const runtime = new Runtime({
          gateway,
          engine: new MethodEngine(),
          store: new InMemoryLearningStore(),
          clock: new FakeClock(),
          ids: new CounterIdGenerator(),
          criticAnalyze: (r) => analyze(r),
          // evaluator: undefined — deliberadamente. Este smoke não testa
          // evaluator LLM. Runtime não vai chamar evaluator, e como
          // não passamos studentEvent kind=answer, trustedEvaluation é
          // irrelevante nesta rodada.
          questionBank: bank,
          questionSelector: selector,
          requireQuestion: true,
          misconceptionRegistry,
          // Sem allowMissingMisconceptionRegistry — evaluator=undefined,
          // então o guard não dispara.
        })

        // -----------------------------------------------------------
        // Tick 1 — primeira interação
        // -----------------------------------------------------------
        const startedAt = Date.now()
        const out = await runtime.tick({
          studentId: "smoke-runtime-1",
          topic: "funcao-quadratica",
          message:
            "Não sei o que é função quadrática. Nem lembro a fórmula.",
          context: {
            subject: "matematica",
            grade: "EM01",
            schoolStage: "high",
          },
        })
        const latencyMs = Date.now() - startedAt

        // -----------------------------------------------------------
        // Métricas — NUNCA conteúdo
        // -----------------------------------------------------------
        // eslint-disable-next-line no-console
        console.log(
          `[smoke-runtime] === RUNTIME.TICK REAL — BASELINE ===`,
        )
        // eslint-disable-next-line no-console
        console.log(
          `[smoke-runtime] executedPhase=${out.executedPhase} strategy=${out.strategy ?? "(none)"} refinementAttempts=${out.refinementAttempts} latency_ms=${latencyMs}`,
        )
        // eslint-disable-next-line no-console
        console.log(
          `[smoke-runtime] budgets: ticks=${out.state.ticks} generativeTurns=${out.state.generativeTurns} refinementAttempts=${out.state.refinementAttempts} adaptCount=${out.state.adaptCount}`,
        )
        // eslint-disable-next-line no-console
        console.log(
          `[smoke-runtime] pendingQuestionId=${out.state.pendingQuestionId ?? "(none)"} selectedQuestion=${out.selectedQuestion?.id ?? "(none)"} selectedType=${out.selectedQuestion?.questionType ?? "-"} selectedDifficulty=${out.selectedQuestion?.difficulty ?? "-"}`,
        )
        if (out.aborted) {
          // eslint-disable-next-line no-console
          console.log(
            `[smoke-runtime] ABORTED: reason=${out.aborted.reason} detail=${out.aborted.detail ?? "-"} issueCodes=${(out.aborted.issueCodes ?? []).join(",")}`,
          )
          // Fase 2B.5-diag Alt 1: campos sanitizados do diagnostic — SÓ
          // metadata, NUNCA prompt/response/apiKey/headers/body/message crua.
          const d = out.aborted.diagnostic
          if (d) {
            // eslint-disable-next-line no-console
            console.log(
              `[smoke-runtime] === DIAGNOSTIC (sanitizado) ===`,
            )
            // eslint-disable-next-line no-console
            console.log(
              `[smoke-runtime] errorClass=${d.errorClass ?? "-"} errorName=${d.errorName ?? "-"} errorCodeFromSdk=${d.errorCodeFromSdk ?? "-"}`,
            )
            // eslint-disable-next-line no-console
            console.log(
              `[smoke-runtime] causeName=${d.causeName ?? "-"} causeClass=${d.causeClass ?? "-"} causeChain=[${(d.causeChain ?? []).join(",")}]`,
            )
            // eslint-disable-next-line no-console
            console.log(
              `[smoke-runtime] finishReason=${d.finishReason ?? "-"} textLength=${d.textLength ?? "-"} responseId=${d.responseId ?? "-"}`,
            )
            // eslint-disable-next-line no-console
            console.log(
              `[smoke-runtime] promptTokens=${d.promptTokens ?? "-"} completionTokens=${d.completionTokens ?? "-"} totalTokens=${d.totalTokens ?? "-"}`,
            )
            // eslint-disable-next-line no-console
            console.log(
              `[smoke-runtime] retryCount=${d.retryCount ?? "-"} retryReason=${d.retryReason ?? "-"} isRetryable=${d.isRetryable ?? "-"} statusCode=${d.statusCode ?? "-"}`,
            )
            // Fase 2B.5-diag Alt 2: Zod issues estruturais — SÓ metadata,
            // NUNCA valores concretos. Paths sanitizados via allow-list.
            if (d.zodIssueCount !== undefined) {
              // eslint-disable-next-line no-console
              console.log(
                `[smoke-runtime] === ZOD ISSUES (sanitizadas) count=${d.zodIssueCount} (mostrando até 20) ===`,
              )
              const paths = d.zodIssuePaths ?? []
              const codes = d.zodIssueCodes ?? []
              const expected = d.zodIssueExpected ?? []
              const receivedType = d.zodIssueReceivedType ?? []
              const n = Math.min(
                paths.length,
                codes.length,
                expected.length,
                receivedType.length,
              )
              for (let i = 0; i < n; i++) {
                // eslint-disable-next-line no-console
                console.log(
                  `[smoke-runtime]   [${i}] path=${paths[i]} code=${codes[i]} expected=${expected[i]} receivedType=${receivedType[i]}`,
                )
              }
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(
              `[smoke-runtime] === DIAGNOSTIC AUSENTE — provider não devolveu ProviderInvocationError com .diagnostic populado (gate off?) ===`,
            )
          }
        }
        if (out.reply) {
          const r = out.reply
          // eslint-disable-next-line no-console
          console.log(
            `[smoke-runtime] reply shape: claims=${r.claims.length} evidences=${r.evidences.length} sources=${r.sources.length} analyses=${r.analyses.length} reviews=${r.reviews.length} detectedConflicts=${r.detectedConflicts.length}`,
          )
        }
        if (out.criticReport) {
          const cr = out.criticReport
          // eslint-disable-next-line no-console
          console.log(
            `[smoke-runtime] critic: recommendedAction=${cr.recommendedAction} checksExecuted=${cr.checksExecuted} checksFailed=${cr.checksFailed} issues=${cr.issues.length}`,
          )
          // eslint-disable-next-line no-console
          console.log(
            `[smoke-runtime] critic rulesRun=${cr.ruleIdsRun.join(",")}`,
          )
          for (const iss of cr.issues) {
            // eslint-disable-next-line no-console
            console.log(
              `[smoke-runtime]   issue code=${iss.code} severity=${iss.severity} location=${iss.location} rule=${iss.ruleId}`,
            )
          }
          for (const hint of cr.refinementHints) {
            // eslint-disable-next-line no-console
            console.log(
              `[smoke-runtime]   hint code=${hint.issueCode} priority=${hint.priority} op=${hint.operation}`,
            )
          }
        }
        // Provider metadata
        // eslint-disable-next-line no-console
        console.log(
          `[smoke-runtime] telemetry_records=${usageRecords.length}`,
        )
        let totalPromptTokens = 0
        let totalCompletionTokens = 0
        for (const rec of usageRecords) {
          const p = rec.usage?.promptTokens ?? 0
          const c = rec.usage?.completionTokens ?? 0
          totalPromptTokens += p
          totalCompletionTokens += c
          // eslint-disable-next-line no-console
          console.log(
            `[smoke-runtime]   op=${rec.operation} provider=${rec.providerId} model=${rec.modelId} latency_ms=${rec.latencyMs} status=${rec.status} promptTokens=${p} completionTokens=${c}${rec.errorCode ? ` errorCode=${rec.errorCode}` : ""}`,
          )
        }
        const pricing = PRICING[MODEL_ID]
        if (pricing) {
          const cost =
            (totalPromptTokens / 1_000_000) * pricing.input +
            (totalCompletionTokens / 1_000_000) * pricing.output
          // eslint-disable-next-line no-console
          console.log(
            `[smoke-runtime] estimated_cost_usd=$${cost.toFixed(6)} (input=$${pricing.input}/1M output=$${pricing.output}/1M)`,
          )
        }

        // -----------------------------------------------------------
        // Assertions PASS/FAIL — sem "amaciar" nada
        // -----------------------------------------------------------
        expect(out.aborted).toBeUndefined()
        expect(out.executedPhase).toBe("diagnose")

        // Provider correto
        expect(usageRecords.length).toBeGreaterThan(0)
        for (const rec of usageRecords) {
          expect(rec.providerId).toBe("openai")
          expect(rec.modelId).toBe(MODEL_ID)
        }

        // Question do bank foi selecionada
        expect(out.selectedQuestion).not.toBeNull()
        expect(out.selectedQuestion?.questionType).toBe("diagnostic")
        expect(out.state.pendingQuestionId).toBe(out.selectedQuestion?.id)

        // Reply real presente
        expect(out.reply).not.toBeNull()
        const reply = out.reply!
        expect(reply.claims.length).toBeGreaterThanOrEqual(1)
        expect(reply.evidences.length).toBeGreaterThanOrEqual(1)
        expect(reply.sources.length).toBeGreaterThanOrEqual(1)
        // Fase 0.1: `analyses` é opcional por design. O schema declara
        // `z.array(analysisSchema).max(...)` SEM `.min(1)`, e nenhuma das 8
        // regras do Critic exige analyses não-vazia. Uma resposta
        // legítima em `diagnose` pode não ter Analysis ainda — Analysis
        // é interpretação, que pode aparecer em fases posteriores
        // (explain/verify/adapt). Aqui só validamos que é um array.
        // Presença obrigatória por fase seria mudança de CONTRATO, não
        // do teste.
        expect(Array.isArray(reply.analyses)).toBe(true)
        // Invariantes que o schema REALMENTE exige (`.min(1)`): valida
        // que essas garantias do contrato realmente chegam no reply.
        expect(reply.primaryTakeaway.length).toBeGreaterThan(0)
        expect(reply.nextStep.length).toBeGreaterThan(0)

        // Critic rodou e não rejeitou (accept ou refine aceitos —
        // reject significa que schema/critic bloqueou de vez).
        expect(out.criticReport).not.toBeNull()
        expect(["accept", "refine"]).toContain(
          out.criticReport!.recommendedAction,
        )

        // Integridade referencial — Critic da 0.1 já checa via
        // schemaIntegrityRule, mas assertimos EXPLICITAMENTE aqui pra
        // deixar a evidência no smoke output.
        const evidenceIds = new Set(reply.evidences.map((e) => e.id))
        const sourceIds = new Set(reply.sources.map((s) => s.id))
        for (const claim of reply.claims) {
          for (const eid of claim.evidenceIds) {
            expect(evidenceIds).toContain(eid)
          }
        }
        for (const evidence of reply.evidences) {
          expect(sourceIds).toContain(evidence.sourceId)
        }

        // Budgets fizeram sentido
        expect(out.state.ticks).toBe(1)
        expect(out.state.generativeTurns).toBe(1)
        expect(out.state.refinementAttempts).toBeGreaterThanOrEqual(1)
      },
    )
  },
)

// Skip explícito quando gates off
describe.runIf(!SMOKE_ENABLED || !HAS_OPENAI_KEY)(
  "SMOKE gates — skip explicit (runtime-openai)",
  () => {
    it("smoke runtime-openai pulado — precisa ATENIS_SMOKE_ENABLED=true E OPENAI_API_KEY", () => {
      // eslint-disable-next-line no-console
      console.log(
        `[smoke-runtime] skipped: ATENIS_SMOKE_ENABLED=${process.env.ATENIS_SMOKE_ENABLED ?? "(unset)"} HAS_OPENAI_KEY=${HAS_OPENAI_KEY}`,
      )
      expect(true).toBe(true)
    })
  },
)
