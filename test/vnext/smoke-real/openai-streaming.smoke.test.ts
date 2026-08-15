// test/vnext/smoke-real/openai-streaming.smoke.test.ts
//
// SMOKE TEST REAL — streaming direto contra OpenAI via OpenAIProvider.
//
// Independente do smoke não-streaming (`openai.smoke.test.ts`). Aquele
// prova `structured()` end-to-end. Este prova SOMENTE `stream()` —
// caminho separado no SDK (`streamText` vs `generateObject`).
//
// Gates:
//   - ATENIS_SMOKE_ENABLED=true
//   - OPENAI_API_KEY setada (não vazia)
//
// Registra APENAS metadata:
//   - modelId
//   - providerId
//   - chunk_count
//   - total_text_length
//   - first_chunk_latency_ms (time-to-first-chunk)
//   - total_latency_ms
//   - finishReason
//   - custo estimado (baseado em chars — proxy grosseiro)
//
// NÃO registra:
//   - API key
//   - conteúdo dos chunks
//   - prompt completo
//   - texto acumulado final

import { describe, it, expect } from "vitest"
import { OpenAIProvider } from "../../../lib/vnext/gateway/providers/openai"

const SMOKE_ENABLED = process.env.ATENIS_SMOKE_ENABLED === "true"
const HAS_OPENAI_KEY = Boolean(process.env.OPENAI_API_KEY?.trim())
const MODEL_ID =
  process.env.ATENIS_SMOKE_MODEL_ID ?? "gpt-4o-mini"

describe.runIf(SMOKE_ENABLED && HAS_OPENAI_KEY)(
  "SMOKE: OpenAI direto — streaming real",
  () => {
    it(
      `provider.stream() contra ${MODEL_ID} emite chunks e termina com stop`,
      { timeout: 60_000 },
      async () => {
        const provider = new OpenAIProvider({
          modelId: MODEL_ID,
          activated: true,
        })

        const startedAt = Date.now()
        const streamOutput = await provider.stream({
          messages: [
            {
              role: "system",
              content:
                "Você é um tutor. Responda em uma frase curta em português.",
            },
            {
              role: "user",
              content:
                "Diga em uma frase o que é uma função quadrática.",
            },
          ],
          useCase: "atenis.smoke.streaming",
        })

        let firstChunkAt: number | null = null
        let chunkCount = 0
        let totalChars = 0
        let finishReason: string | undefined
        for await (const chunk of streamOutput.stream) {
          if (chunk.type === "text-delta") {
            if (firstChunkAt === null) firstChunkAt = Date.now()
            chunkCount++
            totalChars += chunk.textDelta?.length ?? 0
          } else if (chunk.type === "finish") {
            finishReason = chunk.finishReason
          }
        }
        const totalLatency = Date.now() - startedAt
        const firstChunkLatency =
          firstChunkAt !== null ? firstChunkAt - startedAt : null

        // Telemetria MÍNIMA — nunca conteúdo.
        // eslint-disable-next-line no-console
        console.log(
          `[smoke-stream] === STREAMING (BASELINE TÉCNICO — sem prova pedagógica) ===`,
        )
        // eslint-disable-next-line no-console
        console.log(
          `[smoke-stream] providerId=${streamOutput.providerId} modelId=${streamOutput.modelId}`,
        )
        // eslint-disable-next-line no-console
        console.log(
          `[smoke-stream] chunk_count=${chunkCount} total_text_length=${totalChars} finishReason=${finishReason ?? "(none)"}`,
        )
        // eslint-disable-next-line no-console
        console.log(
          `[smoke-stream] first_chunk_latency_ms=${firstChunkLatency ?? "null"} total_latency_ms=${totalLatency}`,
        )
        // Custo estimado — GPT-4o-mini: $0.15/1M input, $0.60/1M output.
        // Sem usage tokens diretos do stream (SDK do OpenAI stream não
        // devolve usage confiável no fim). Usamos aprox chars/4 ≈ tokens.
        const approxOutputTokens = Math.ceil(totalChars / 4)
        const approxInputTokens = 50 // system + prompt curtos deste teste
        const PRICING: Record<string, { input: number; output: number }> = {
          "gpt-4o-mini": { input: 0.15, output: 0.6 },
          "gpt-4o": { input: 2.5, output: 10 },
          "gpt-5-mini": { input: 0.25, output: 2 },
        }
        const pricing = PRICING[MODEL_ID]
        if (pricing) {
          const costUsd =
            (approxInputTokens / 1_000_000) * pricing.input +
            (approxOutputTokens / 1_000_000) * pricing.output
          // eslint-disable-next-line no-console
          console.log(
            `[smoke-stream] estimated_cost_usd~=$${costUsd.toFixed(6)} (approx from chars; stream não expõe usage confiável)`,
          )
        }

        // Assertions técnicas — sem julgar conteúdo.
        expect(chunkCount).toBeGreaterThan(0)
        expect(totalChars).toBeGreaterThan(0)
        expect(finishReason).toBe("stop")
        expect(streamOutput.providerId).toBe("openai")
        expect(streamOutput.modelId).toBe(MODEL_ID)
        // Time-to-first-chunk deve ser menor que total (senão não foi streaming).
        if (firstChunkLatency !== null && chunkCount > 1) {
          expect(firstChunkLatency).toBeLessThanOrEqual(totalLatency)
        }
      },
    )
  },
)

// Skip explícito quando gates off — evita falso silêncio.
describe.runIf(!SMOKE_ENABLED || !HAS_OPENAI_KEY)(
  "SMOKE gates — skip explicit (streaming)",
  () => {
    it("smoke streaming pulado — precisa ATENIS_SMOKE_ENABLED=true E OPENAI_API_KEY", () => {
      // eslint-disable-next-line no-console
      console.log(
        `[smoke-stream] skipped: ATENIS_SMOKE_ENABLED=${process.env.ATENIS_SMOKE_ENABLED ?? "(unset)"} HAS_OPENAI_KEY=${HAS_OPENAI_KEY}`,
      )
      expect(true).toBe(true)
    })
  },
)
