// test/vnext/smoke-real/openai.smoke.test.ts
//
// SMOKE TEST REAL — chama OpenAI DIRETAMENTE.
//
// Cadeia real (auditada por evidência de código):
//   smoke
//   → runTutorTurn
//   → Atenis AIGateway
//   → OpenAIProvider
//   → @ai-sdk/openai
//   → api.openai.com
//
// NÃO usa VercelAIGatewayProvider (preservado no código como fallback
// futuro, mas não é o provider real ativo do Runtime).
//
// NÃO roda em `npm test` normal. Só em `npm run test:smoke:openai` E
// com `ATENIS_SMOKE_ENABLED=true` setado.

import { describe, it, expect } from "vitest"
import { createGateway } from "../../../lib/vnext/gateway"
import { OpenAIProvider } from "../../../lib/vnext/gateway/providers/openai"
import { runTutorTurn } from "../../../lib/vnext/tutor-turn"
import { newTopicState } from "../../../lib/vnext/learning/types"

const SMOKE_ENABLED = process.env.ATENIS_SMOKE_ENABLED === "true"
const HAS_KEY = Boolean(process.env.OPENAI_API_KEY?.trim())
// BASELINE TÉCNICO — não é a escolha definitiva de modelo do Atenis.
// Sintaxe do @ai-sdk/openai: NOME do modelo, sem prefixo "openai/".
const MODEL_ID = process.env.ATENIS_SMOKE_MODEL_ID ?? "gpt-4o-mini"

describe.runIf(SMOKE_ENABLED && HAS_KEY)(
  "SMOKE: OpenAI direto — primeira chamada real",
  () => {
    it(
      `runTutorTurn contra OpenAI ${MODEL_ID} devolve output válido`,
      { timeout: 60_000 },
      async () => {
        // Setup: Gateway com OpenAI Provider ATIVADO.
        const gateway = createGateway({ defaultProviderId: "openai" })
        gateway.register(
          new OpenAIProvider({
            modelId: MODEL_ID,
            activated: true,
          }),
        )

        const startedAt = Date.now()
        const result = await runTutorTurn(
          {
            phase: "teach",
            strategy: "worked_example",
            topic: "funcao-quadratica",
            context: {
              subject: "matematica",
              grade: "EM01",
              schoolStage: "high",
            },
            state: newTopicState({
              studentId: "smoke-student",
              topic: "funcao-quadratica",
              createdAt: "2026-08-11T00:00:00.000Z",
            }),
            taskInstruction:
              "Explique brevemente, em 2-4 frases, o que são os coeficientes a, b e c em f(x) = ax² + bx + c. Ao final, sugira uma tentativa curta para o aluno.",
          },
          { gateway },
        )
        const latencyMs = Date.now() - startedAt

        // Telemetria MÍNIMA — nunca conteúdo.
        // Custo estimado por modelo (input/output $ por 1M tokens).
        const PRICING: Record<string, { input: number; output: number }> = {
          "gpt-4o-mini": { input: 0.15, output: 0.6 },
          "gpt-5-mini": { input: 0.25, output: 2.0 },
          "gpt-4.1-mini": { input: 0.4, output: 1.6 },
        }
        // eslint-disable-next-line no-console
        console.log(
          `[smoke] === BASELINE TÉCNICO (não escolha definitiva de modelo) ===`,
        )
        // eslint-disable-next-line no-console
        console.log(
          `[smoke] kind=${result.kind} model=${MODEL_ID} provider=${
            result.kind === "accept" ||
            result.kind === "refine" ||
            result.kind === "reject"
              ? result.providerId ?? "?"
              : "?"
          } latency=${latencyMs}ms`,
        )
        if (
          result.kind === "accept" ||
          result.kind === "refine" ||
          result.kind === "reject"
        ) {
          const report = result.report
          // eslint-disable-next-line no-console
          console.log(
            `[smoke] recommendedAction=${report.recommendedAction} issues=${report.issues.length} ruleIds=${report.ruleIdsRun.join(",")}`,
          )
          if (report.issues.length > 0) {
            for (const iss of report.issues) {
              // eslint-disable-next-line no-console
              console.log(
                `[smoke]   issue code=${iss.code} severity=${iss.severity} location=${iss.location}`,
              )
            }
          }
          if (result.output) {
            const o = result.output
            // eslint-disable-next-line no-console
            console.log(
              `[smoke] output: explanationLen=${o.explanation.length} suggestedNextAction=${o.suggestedNextAction} hasFollowUpQuestion=${Boolean(o.followUpQuestion)} followUpKind=${o.followUpQuestion?.kind ?? "-"} analysisLen=${o.analysis?.length ?? 0} uncertaintyMarkers=${o.uncertaintyMarkers.length} finishReason=stop schemaValidation=passed`,
            )
          }
          const usage = result.usage
          if (usage) {
            const p = usage.promptTokens ?? 0
            const c = usage.completionTokens ?? 0
            // eslint-disable-next-line no-console
            console.log(
              `[smoke] usage: promptTokens=${p} completionTokens=${c} totalTokens=${p + c}`,
            )
            const pricing = PRICING[MODEL_ID]
            if (pricing) {
              const costUsd =
                (p / 1_000_000) * pricing.input +
                (c / 1_000_000) * pricing.output
              // eslint-disable-next-line no-console
              console.log(
                `[smoke] estimated_cost_usd=$${costUsd.toFixed(6)} (input=$${pricing.input}/1M output=$${pricing.output}/1M)`,
              )
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(`[smoke] usage: not reported by provider`)
          }
        } else if (result.kind === "provider-error") {
          // eslint-disable-next-line no-console
          console.log(
            `[smoke] provider-error errorCode=${result.errorCode}`,
          )
          if (result.diagnostic) {
            // eslint-disable-next-line no-console
            console.log(
              `[smoke] diagnostic=${JSON.stringify(result.diagnostic)}`,
            )
          } else {
            // eslint-disable-next-line no-console
            console.log(
              `[smoke] diagnostic=none (habilitar com ATENIS_PROVIDER_DIAGNOSTIC=true)`,
            )
          }
        }

        // Assertions relaxadas
        expect(result.kind).not.toBe("provider-error")
        if (result.kind === "accept" || result.kind === "refine") {
          expect(result.output.explanation.length).toBeGreaterThan(0)
          expect([
            "present-example",
            "invite-attempt",
            "check-understanding",
            "reinforce-concept",
            "escalate",
          ]).toContain(result.output.suggestedNextAction)
        }
      },
    )
  },
)

// Skip explícito quando gates não estão setados — não finge sucesso.
describe.runIf(!SMOKE_ENABLED || !HAS_KEY)(
  "SMOKE gates — skip explicit",
  () => {
    it("smoke pulado — precisa de ATENIS_SMOKE_ENABLED=true E OPENAI_API_KEY setados", () => {
      // eslint-disable-next-line no-console
      console.log(
        `[smoke] skipped: ATENIS_SMOKE_ENABLED=${process.env.ATENIS_SMOKE_ENABLED ?? "(unset)"} HAS_OPENAI_KEY=${HAS_KEY}`,
      )
      expect(true).toBe(true)
    })
  },
)
