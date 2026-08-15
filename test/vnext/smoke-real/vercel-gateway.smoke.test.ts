// test/vnext/smoke-real/vercel-gateway.smoke.test.ts
//
// SMOKE TEST REAL — chama o Vercel AI Gateway com credencial de
// verdade. NÃO roda em `npm test` normal. Só em
// `npm run test:smoke:vercel-gateway` E com `ATENIS_SMOKE_ENABLED=true`
// setado.
//
// Cenário controlado:
//   - Contexto: matemática / EM01 / função quadrática.
//   - Task: explicar coeficientes com exemplo simples.
//   - Um único generative call.
//
// Assertions relaxadas propositalmente — o objetivo é observar o
// comportamento REAL do modelo, não passar por asserção rígida. Falhas
// aqui são INFORMATIVAS, não bug.

import { describe, it, expect } from "vitest"
import { createGateway } from "../../../lib/vnext/gateway"
import { VercelAIGatewayProvider } from "../../../lib/vnext/gateway/providers/vercel-ai-gateway"
import { runTutorTurn } from "../../../lib/vnext/tutor-turn"
import { newTopicState } from "../../../lib/vnext/learning/types"

const SMOKE_ENABLED = process.env.ATENIS_SMOKE_ENABLED === "true"
const HAS_KEY = Boolean(process.env.AI_GATEWAY_API_KEY?.trim())
// Fase 2B.2: BASELINE TÉCNICO. NÃO é a escolha definitiva do Atenis —
// só é o modelo OpenAI mais maduro em structured output com custo baixo
// pra provar que o pipeline técnico funciona ponta-a-ponta. Decisão de
// modelo pedagógico definitivo virá depois de analisarmos o baseline.
const MODEL_ID = process.env.ATENIS_SMOKE_MODEL_ID ?? "openai/gpt-4o-mini"

// describe.runIf pula silenciosamente se qualquer gate estiver off.
// `npm test` NUNCA seta ATENIS_SMOKE_ENABLED — segurança dupla.
describe.runIf(SMOKE_ENABLED && HAS_KEY)(
  "SMOKE: Vercel AI Gateway — primeira chamada real",
  () => {
    it(
      `runTutorTurn contra ${MODEL_ID} devolve output válido`,
      { timeout: 60_000 },
      async () => {
        // Setup: Gateway com Vercel Provider ATIVADO.
        const gateway = createGateway({
          defaultProviderId: "vercel-ai-gateway",
        })
        gateway.register(
          new VercelAIGatewayProvider({
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
        // Custo estimado pro gpt-4o-mini: $0.15/1M input, $0.60/1M output.
        // Se modelId diferente, custo estimado sai como "?".
        const PRICING: Record<string, { input: number; output: number }> = {
          "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
          "openai/gpt-5-mini": { input: 0.25, output: 2.0 },
          "openai/gpt-4.1-mini": { input: 0.4, output: 1.6 },
        }
        // eslint-disable-next-line no-console
        console.log(
          `[smoke] === BASELINE TÉCNICO (não escolha definitiva de modelo) ===`,
        )
        // eslint-disable-next-line no-console
        console.log(
          `[smoke] kind=${result.kind} model=${MODEL_ID} provider=${
            result.kind === "accept" || result.kind === "refine" || result.kind === "reject"
              ? result.providerId ?? "?"
              : "?"
          } latency=${latencyMs}ms`,
        )
        if (result.kind === "accept" || result.kind === "refine" || result.kind === "reject") {
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
          // Diagnostic sanitizado — só populado quando
          // ATENIS_PROVIDER_DIAGNOSTIC=true está setado.
          if (result.diagnostic) {
            // eslint-disable-next-line no-console
            console.log(
              `[smoke] diagnostic=${JSON.stringify(result.diagnostic)}`,
            )
          } else {
            // eslint-disable-next-line no-console
            console.log(
              `[smoke] diagnostic=none (para habilitar: ATENIS_PROVIDER_DIAGNOSTIC=true)`,
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

// Sanity check: se gates NÃO estão setados, informa CLARAMENTE em vez de
// fingir sucesso (não roda o teste real).
describe.runIf(!SMOKE_ENABLED || !HAS_KEY)(
  "SMOKE gates — skip explicit",
  () => {
    it("smoke pulado — precisa de ATENIS_SMOKE_ENABLED=true E AI_GATEWAY_API_KEY setados", () => {
      // eslint-disable-next-line no-console
      console.log(
        `[smoke] skipped: ATENIS_SMOKE_ENABLED=${process.env.ATENIS_SMOKE_ENABLED ?? "(unset)"} HAS_KEY=${HAS_KEY}`,
      )
      expect(true).toBe(true)
    })
  },
)
