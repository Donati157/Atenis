// test/vnext/gateway/error-classifier-no-object.test.ts
//
// Fase 2B.5-diag (plano A): a próxima chamada real ao Runtime tem que
// permitir DISTINGUIR entre os dois modos de falha do generateObject:
//
//   (A) JSON parse failure — modelo devolveu texto que não é JSON válido.
//       AI SDK v5 envolve como NoObjectGeneratedError com cause = JSONParseError.
//   (B) Schema mismatch — modelo devolveu JSON válido, mas Zod (dentro
//       do SDK) rejeitou. AI SDK v5 envolve como NoObjectGeneratedError com
//       cause = TypeValidationError.
//
// Este arquivo testa OFFLINE que o classifier expõe cause.name/cause.class
// no diagnostic e captura os sinais de LLM (finishReason, usage, response.id,
// text.length) SEM VAZAR conteúdo textual, prompt, API key, headers ou
// Authorization.
//
// NÃO faz chamada real. NÃO mexe em schema. NÃO mexe em Runtime.

import { describe, it, expect, afterEach } from "vitest"
import { classifyErrorForTests } from "../../../lib/vnext/gateway/providers/vercel-ai-gateway"

const ORIG_DIAG_ENV = process.env.ATENIS_PROVIDER_DIAGNOSTIC
afterEach(() => {
  if (ORIG_DIAG_ENV === undefined) {
    delete process.env.ATENIS_PROVIDER_DIAGNOSTIC
  } else {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = ORIG_DIAG_ENV
  }
})

// Helper: builds an exception whose constructor.name and .name match `cls`
// e permite plantar propriedades adicionais (statusCode, cause, text,
// response, usage, finishReason, errors, reason).
function fakeError(cls: string, props: Record<string, unknown> = {}): Error {
  class FakeErrorCtor extends Error {
    constructor() {
      super("simulated")
      Object.defineProperty(this.constructor, "name", { value: cls })
      Object.defineProperty(this, "name", { value: cls })
      Object.assign(this, props)
    }
  }
  Object.defineProperty(FakeErrorCtor, "name", { value: cls })
  return new FakeErrorCtor()
}

// ---------------------------------------------------------------------------
// Cenário A — NoObjectGeneratedError causado por JSON PARSE FAILURE
// ---------------------------------------------------------------------------
describe("classifier — NoObjectGeneratedError (A) parse failure", () => {
  it("com cause=JSONParseError, causeName e causeClass distinguem o caso A", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const parseCause = fakeError("JSONParseError", {})
    const err = fakeError("NoObjectGeneratedError", {
      cause: parseCause,
      text: "not json {oops",
      finishReason: "stop",
      usage: {
        inputTokens: 1200,
        outputTokens: 8,
        totalTokens: 1208,
      },
      response: { id: "chatcmpl-DIAG-A" },
    })
    const result = classifyErrorForTests(err)
    expect(result.code).toBe("STRUCTURED_OUTPUT_INVALID")
    expect(result.diagnostic).toBeDefined()
    expect(result.diagnostic?.causeName).toBe("JSONParseError")
    expect(result.diagnostic?.causeClass).toBe("JSONParseError")
    expect(result.diagnostic?.finishReason).toBe("stop")
    expect(result.diagnostic?.promptTokens).toBe(1200)
    expect(result.diagnostic?.completionTokens).toBe(8)
    expect(result.diagnostic?.totalTokens).toBe(1208)
    expect(result.diagnostic?.responseId).toBe("chatcmpl-DIAG-A")
    // textLength presente, texto não.
    expect(result.diagnostic?.textLength).toBe("not json {oops".length)
    const asJson = JSON.stringify(result.diagnostic)
    expect(asJson).not.toContain("not json {oops")
    expect(asJson).not.toContain("oops")
  })
})

// ---------------------------------------------------------------------------
// Cenário B — NoObjectGeneratedError causado por SCHEMA MISMATCH
// ---------------------------------------------------------------------------
describe("classifier — NoObjectGeneratedError (B) schema mismatch", () => {
  it("com cause=TypeValidationError, causeName e causeClass distinguem o caso B", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const validationCause = fakeError("TypeValidationError", {})
    const err = fakeError("NoObjectGeneratedError", {
      cause: validationCause,
      text: '{"partial":true}',
      finishReason: "stop",
      usage: {
        inputTokens: 1500,
        outputTokens: 512,
        totalTokens: 2012,
      },
      response: { id: "chatcmpl-DIAG-B" },
    })
    const result = classifyErrorForTests(err)
    expect(result.code).toBe("STRUCTURED_OUTPUT_INVALID")
    expect(result.diagnostic).toBeDefined()
    expect(result.diagnostic?.causeName).toBe("TypeValidationError")
    expect(result.diagnostic?.causeClass).toBe("TypeValidationError")
    expect(result.diagnostic?.finishReason).toBe("stop")
    expect(result.diagnostic?.promptTokens).toBe(1500)
    expect(result.diagnostic?.completionTokens).toBe(512)
    expect(result.diagnostic?.totalTokens).toBe(2012)
    expect(result.diagnostic?.textLength).toBe('{"partial":true}'.length)
    // NÃO deve vazar o payload do modelo.
    const asJson = JSON.stringify(result.diagnostic)
    expect(asJson).not.toContain("partial")
    expect(asJson).not.toContain('{"partial":true}')
  })

  it("A vs B são distinguíveis: causeName é o discriminador binário", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const a = fakeError("NoObjectGeneratedError", {
      cause: fakeError("JSONParseError"),
    })
    const b = fakeError("NoObjectGeneratedError", {
      cause: fakeError("TypeValidationError"),
    })
    const diagA = classifyErrorForTests(a).diagnostic
    const diagB = classifyErrorForTests(b).diagnostic
    // Mesmo code no classifier, mas causeName diferente pra distinguir.
    expect(diagA?.causeName).toBe("JSONParseError")
    expect(diagB?.causeName).toBe("TypeValidationError")
    expect(diagA?.causeName).not.toBe(diagB?.causeName)
  })
})

// ---------------------------------------------------------------------------
// Sanitização: nada de prompt, response, apiKey, headers, Authorization.
// ---------------------------------------------------------------------------
describe("classifier — sanitização estendida (NoObjectGenerated)", () => {
  it("text do modelo NUNCA aparece; só length", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const secretModelOutput =
      '{"student_pii":"XPTO-SSN-12345","essay":"história inteira que não pode vazar"}'
    const err = fakeError("NoObjectGeneratedError", {
      cause: fakeError("TypeValidationError"),
      text: secretModelOutput,
      usage: { inputTokens: 100, outputTokens: 40, totalTokens: 140 },
    })
    const result = classifyErrorForTests(err)
    expect(result.diagnostic?.textLength).toBe(secretModelOutput.length)
    const asJson = JSON.stringify(result.diagnostic)
    expect(asJson).not.toContain("XPTO-SSN-12345")
    expect(asJson).not.toContain("student_pii")
    expect(asJson).not.toContain("história")
    expect(asJson).not.toContain("essay")
    // Não deve incluir a message da exception original, que também poderia
    // ter texto embutido.
    expect(asJson).not.toContain("simulated")
  })

  it("response.headers NUNCA aparece (podem carregar Authorization/apiKey echo)", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const err = fakeError("NoObjectGeneratedError", {
      cause: fakeError("JSONParseError"),
      response: {
        id: "chatcmpl-safe-id",
        headers: {
          Authorization: "Bearer sk-SUPER-SECRET",
          "x-api-key": "sk-ANOTHER-SECRET",
          "set-cookie": "session=SECRETCOOKIE",
        },
      },
    })
    const result = classifyErrorForTests(err)
    expect(result.diagnostic?.responseId).toBe("chatcmpl-safe-id")
    const asJson = JSON.stringify(result.diagnostic)
    expect(asJson).not.toContain("Bearer")
    expect(asJson).not.toContain("sk-SUPER-SECRET")
    expect(asJson).not.toContain("sk-ANOTHER-SECRET")
    expect(asJson).not.toContain("Authorization")
    expect(asJson).not.toContain("SECRETCOOKIE")
    expect(asJson).not.toContain("set-cookie")
    expect(asJson).not.toContain("headers")
  })

  it("responseId que PARECE credencial (sk-*, Bearer, apiKey) é rejeitado", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const cases = [
      "sk-abc123def456",
      "Bearer sk-token",
      "Basic dXNlcjpwYXNz",
      "opaque_apikey_here",
      "some-thing-with-api_key-inside",
    ]
    for (const suspiciousId of cases) {
      const err = fakeError("NoObjectGeneratedError", {
        cause: fakeError("JSONParseError"),
        response: { id: suspiciousId },
      })
      const result = classifyErrorForTests(err)
      const asJson = JSON.stringify(result.diagnostic ?? {})
      expect(
        result.diagnostic?.responseId,
        `responseId "${suspiciousId}" deveria ter sido rejeitado`,
      ).toBeUndefined()
      expect(asJson).not.toContain(suspiciousId)
    }
  })

  it("responseId opaco normal (chatcmpl-*) é aceito", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const err = fakeError("NoObjectGeneratedError", {
      cause: fakeError("TypeValidationError"),
      response: { id: "chatcmpl-abc123xyz" },
    })
    const result = classifyErrorForTests(err)
    expect(result.diagnostic?.responseId).toBe("chatcmpl-abc123xyz")
  })

  it("responseId muito longo (>= 200 chars) é rejeitado por precaução", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const veryLong = "x".repeat(400)
    const err = fakeError("NoObjectGeneratedError", {
      cause: fakeError("JSONParseError"),
      response: { id: veryLong },
    })
    const result = classifyErrorForTests(err)
    expect(result.diagnostic?.responseId).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Retry loop: RetryError expõe reason + errors.length
// ---------------------------------------------------------------------------
describe("classifier — RetryError sinaliza repair count/reason", () => {
  it("RetryError com errors[] e reason é capturado como retryCount/retryReason", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const err = fakeError("RetryError", {
      reason: "maxRetriesExceeded",
      errors: [
        fakeError("NoObjectGeneratedError"),
        fakeError("NoObjectGeneratedError"),
        fakeError("NoObjectGeneratedError"),
      ],
    })
    const result = classifyErrorForTests(err)
    expect(result.code).toBe("PROVIDER_TIMEOUT")
    expect(result.diagnostic?.retryReason).toBe("maxRetriesExceeded")
    expect(result.diagnostic?.retryCount).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Backwards compat: NoObjectGeneratedError sem sinais opcionais ainda funciona.
// ---------------------------------------------------------------------------
describe("classifier — NoObjectGeneratedError sem metadata opcional", () => {
  it("sem cause/text/usage/response, campos ficam undefined mas errorClass segue certo", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const err = fakeError("NoObjectGeneratedError")
    const result = classifyErrorForTests(err)
    expect(result.code).toBe("STRUCTURED_OUTPUT_INVALID")
    expect(result.diagnostic?.errorClass).toBe("NoObjectGeneratedError")
    expect(result.diagnostic?.causeName).toBeUndefined()
    expect(result.diagnostic?.causeClass).toBeUndefined()
    expect(result.diagnostic?.finishReason).toBeUndefined()
    expect(result.diagnostic?.promptTokens).toBeUndefined()
    expect(result.diagnostic?.completionTokens).toBeUndefined()
    expect(result.diagnostic?.totalTokens).toBeUndefined()
    expect(result.diagnostic?.responseId).toBeUndefined()
    expect(result.diagnostic?.textLength).toBeUndefined()
  })

  it("gate ATENIS_PROVIDER_DIAGNOSTIC continua respeitado", () => {
    delete process.env.ATENIS_PROVIDER_DIAGNOSTIC
    const err = fakeError("NoObjectGeneratedError", {
      cause: fakeError("TypeValidationError"),
      text: "would-leak-if-not-gated",
      usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    })
    const result = classifyErrorForTests(err)
    expect(result.code).toBe("STRUCTURED_OUTPUT_INVALID")
    // Sem opt-in, diagnostic inteiro é undefined.
    expect(result.diagnostic).toBeUndefined()
  })
})
