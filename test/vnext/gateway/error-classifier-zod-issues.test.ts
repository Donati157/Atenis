// test/vnext/gateway/error-classifier-zod-issues.test.ts
//
// Fase 2B.5-diag Alt 2: quando NoObjectGeneratedError carrega uma
// ZodError na causeChain, precisamos identificar QUAIS constraints do
// schema violaram — SEM vazar o valor recebido, prompt ou response text.
//
// Captura estrutural:
//   - zodIssueCount
//   - zodIssuePaths     (segmentos sanitizados via allow-list)
//   - zodIssueCodes     (invalid_type, too_small, invalid_format, ...)
//   - zodIssueExpected  (expected|origin|format do Zod v4)
//   - zodIssueReceivedType (typeof issue.input — array vira "array")
//
// NÃO captura: issue.input (valor), issue.message (texto humano),
// issue.values, issue.keys (podem vazar nomes de campos que o modelo
// inventou).
//
// Testes usam ZodError REAL do zod v4 pra garantir que o shape casa.

import { describe, it, expect, afterEach } from "vitest"
import { z, ZodError } from "zod"
import { classifyErrorForTests } from "../../../lib/vnext/gateway/providers/vercel-ai-gateway"

const ORIG_DIAG_ENV = process.env.ATENIS_PROVIDER_DIAGNOSTIC
afterEach(() => {
  if (ORIG_DIAG_ENV === undefined) {
    delete process.env.ATENIS_PROVIDER_DIAGNOSTIC
  } else {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = ORIG_DIAG_ENV
  }
})

// Helper: obtém uma ZodError REAL rodando .parse contra input inválido.
// Isso garante que o shape testado é o shape emitido pelo Zod v4 real —
// NÃO um mock que poderia divergir com upgrades futuros do Zod.
function zodErrorFrom<T>(schema: z.ZodType<T>, input: unknown): ZodError {
  const r = schema.safeParse(input)
  if (r.success) throw new Error("test setup: input should have failed schema")
  return r.error
}

// Helper: encapsula ZodError como o AI SDK v5 encapsula
// (NoObjectGeneratedError → cause: TypeValidationError → cause: ZodError).
function wrapAsNoObject(
  zodErr: ZodError,
  levels: 1 | 2 = 2,
): Error {
  class _TypeValidationError extends Error {
    override name = "AI_TypeValidationError"
    constructor(cause: unknown) {
      super("simulated")
      Object.defineProperty(this, "cause", { value: cause })
    }
  }
  class NoObjectGeneratedError extends Error {
    override name = "AI_NoObjectGeneratedError"
    constructor(cause: unknown) {
      super("simulated")
      Object.defineProperty(this, "cause", { value: cause })
    }
  }
  if (levels === 1) return new NoObjectGeneratedError(zodErr)
  const validation = new _TypeValidationError(zodErr)
  return new NoObjectGeneratedError(validation)
}

// ---------------------------------------------------------------------------
// Cenário 1 — invalid_type: modelo mandou number onde schema queria string.
// ---------------------------------------------------------------------------
describe("classifier — ZodError: invalid_type", () => {
  it("captura path, code, expected SEM vazar valor", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const schema = z.object({
      sources: z.array(
        z.object({
          url: z.string(),
        }),
      ),
    })
    const badInput = { sources: [{ url: 42 }] } // number onde deveria ser string
    const zodErr = zodErrorFrom(schema, badInput)
    const wrapped = wrapAsNoObject(zodErr, 2)
    const result = classifyErrorForTests(wrapped)
    expect(result.diagnostic?.zodIssueCount).toBe(1)
    expect(result.diagnostic?.zodIssuePaths).toEqual(["sources.0.url"])
    expect(result.diagnostic?.zodIssueCodes).toEqual(["invalid_type"])
    expect(result.diagnostic?.zodIssueExpected).toEqual(["string"])
    // Zod v4 deliberadamente NÃO popula `issue.input` no safeParse().error.issues
    // (reserva pro error map interno). Meu extractor herda essa segurança:
    // se algum dia Zod expuser, `Array.isArray(input)?"array":typeof input`
    // pega SÓ o tipo. Hoje, o valor "-" prova que o valor concreto (42)
    // NUNCA pôde vazar mesmo sem esforço meu extra.
    expect(result.diagnostic?.zodIssueReceivedType).toEqual(["-"])
    const asJson = JSON.stringify(result.diagnostic)
    expect(asJson).not.toContain("42")
  })
})

// ---------------------------------------------------------------------------
// Cenário 2 — too_small: modelo mandou string vazia num campo com .min(1).
// ---------------------------------------------------------------------------
describe("classifier — ZodError: too_small (min length)", () => {
  it("captura path + code=too_small + expected=string (via origin)", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const schema = z.object({
      claims: z.array(
        z.object({
          text: z.string().min(1),
        }),
      ),
    })
    const badInput = { claims: [{ text: "" }] } // string vazia viola min(1)
    const zodErr = zodErrorFrom(schema, badInput)
    const wrapped = wrapAsNoObject(zodErr)
    const result = classifyErrorForTests(wrapped)
    expect(result.diagnostic?.zodIssueCount).toBe(1)
    expect(result.diagnostic?.zodIssuePaths).toEqual(["claims.0.text"])
    expect(result.diagnostic?.zodIssueCodes).toEqual(["too_small"])
    // Zod v4: too_small tem `origin` = "string" (tipo). Meu extractor
    // usa `origin` como fallback pra `expected`.
    expect(result.diagnostic?.zodIssueExpected).toEqual(["string"])
    // Zod v4 não expõe `input` em too_small — receivedType fica "-".
    expect(result.diagnostic?.zodIssueReceivedType).toEqual(["-"])
  })
})

// ---------------------------------------------------------------------------
// Cenário 3 — invalid_format: modelo mandou string que não é URL.
// ---------------------------------------------------------------------------
describe("classifier — ZodError: invalid_format (url)", () => {
  it("captura format=url no expected sem vazar a string bruta", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const schema = z.object({
      sources: z.array(
        z.object({
          url: z.string().url(),
        }),
      ),
    })
    const badInput = { sources: [{ url: "not-a-url-just-text-XYZ" }] }
    const zodErr = zodErrorFrom(schema, badInput)
    const wrapped = wrapAsNoObject(zodErr)
    const result = classifyErrorForTests(wrapped)
    expect(result.diagnostic?.zodIssueCount).toBe(1)
    expect(result.diagnostic?.zodIssuePaths).toEqual(["sources.0.url"])
    expect(result.diagnostic?.zodIssueCodes).toEqual(["invalid_format"])
    expect(result.diagnostic?.zodIssueExpected).toEqual(["url"])
    // Zod v4 não expõe `input` em invalid_format — receivedType fica "-".
    expect(result.diagnostic?.zodIssueReceivedType).toEqual(["-"])
    const asJson = JSON.stringify(result.diagnostic)
    expect(asJson).not.toContain("not-a-url-just-text-XYZ")
    expect(asJson).not.toContain("XYZ")
  })
})

// ---------------------------------------------------------------------------
// Cenário 4 — múltiplos issues: modelo violou 3 campos diferentes.
// ---------------------------------------------------------------------------
describe("classifier — ZodError: múltiplos issues", () => {
  it("captura todos até MAX_ZOD_ISSUES_CAPTURED, mantém correspondência posicional", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const schema = z.object({
      title: z.string().min(3),
      count: z.number(),
      url: z.string().url(),
    })
    const badInput = { title: "hi", count: "wrong", url: "nope" }
    const zodErr = zodErrorFrom(schema, badInput)
    const wrapped = wrapAsNoObject(zodErr)
    const result = classifyErrorForTests(wrapped)
    expect(result.diagnostic?.zodIssueCount).toBe(3)
    expect(result.diagnostic?.zodIssuePaths?.length).toBe(3)
    expect(result.diagnostic?.zodIssueCodes?.length).toBe(3)
    expect(result.diagnostic?.zodIssueExpected?.length).toBe(3)
    expect(result.diagnostic?.zodIssueReceivedType?.length).toBe(3)
    // Ordem posicional preservada — index N em paths corresponde a N nos outros arrays.
    const paths = result.diagnostic?.zodIssuePaths ?? []
    const codes = result.diagnostic?.zodIssueCodes ?? []
    expect(paths).toContain("title")
    expect(paths).toContain("count")
    expect(paths).toContain("url")
    expect(codes).toContain("too_small")
    expect(codes).toContain("invalid_type")
    expect(codes).toContain("invalid_format")
  })
})

// ---------------------------------------------------------------------------
// Cenário 5 — path aninhado profundo com números (arrays).
// ---------------------------------------------------------------------------
describe("classifier — ZodError: path aninhado", () => {
  it("path com múltiplos níveis e índices é serializado como a.0.b.1.c", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const schema = z.object({
      a: z.array(
        z.object({
          b: z.array(
            z.object({
              c: z.string(),
            }),
          ),
        }),
      ),
    })
    const badInput = {
      a: [{ b: [{ c: 1 }, { c: "ok" }] }],
    }
    const zodErr = zodErrorFrom(schema, badInput)
    const wrapped = wrapAsNoObject(zodErr)
    const result = classifyErrorForTests(wrapped)
    expect(result.diagnostic?.zodIssuePaths).toEqual(["a.0.b.0.c"])
  })
})

// ---------------------------------------------------------------------------
// Cenário 6 — sanitização de segmento suspeito.
// ---------------------------------------------------------------------------
describe("classifier — sanitização de path", () => {
  it("segmento não-identificador é substituído por '?'", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    // Construir ZodError-like manualmente com paths perigosos —
    // usando ZodError real via schema record que aceita qualquer chave.
    const schema = z.record(z.string(), z.string())
    const badInput = { "chave with spaces": 42, "$suspicious/../secret": "x" }
    const zodErr = zodErrorFrom(schema, badInput)
    const wrapped = wrapAsNoObject(zodErr)
    const result = classifyErrorForTests(wrapped)
    // Zod v4 usa a chave literal como path segment. Ambas devem virar "?".
    const paths = result.diagnostic?.zodIssuePaths ?? []
    for (const p of paths) {
      expect(p).toBe("?")
    }
    const asJson = JSON.stringify(result.diagnostic)
    expect(asJson).not.toContain("chave with spaces")
    expect(asJson).not.toContain("secret")
    expect(asJson).not.toContain("suspicious")
  })
})

// ---------------------------------------------------------------------------
// Cenário 7 — ZodError direto (sem NoObjectGenerated envolvendo).
//   Não deve ser catch pelo classifier como NoObjectGenerated, mas as
//   issues devem ser extraídas se cair no path TypeValidation/JSONParse.
// ---------------------------------------------------------------------------
describe("classifier — ZodError como cause direta de TypeValidationError", () => {
  it("captura issues mesmo quando não vem envolto em NoObjectGenerated", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const schema = z.object({ x: z.string() })
    const zodErr = zodErrorFrom(schema, { x: 1 })
    class _TypeValidationError extends Error {
      override name = "AI_TypeValidationError"
      constructor(cause: unknown) {
        super("simulated")
        Object.defineProperty(this, "cause", { value: cause })
      }
    }
    const wrapped = new _TypeValidationError(zodErr)
    const result = classifyErrorForTests(wrapped)
    expect(result.code).toBe("STRUCTURED_VALIDATION_FAILED")
    expect(result.diagnostic?.zodIssueCount).toBe(1)
    expect(result.diagnostic?.zodIssuePaths).toEqual(["x"])
    expect(result.diagnostic?.zodIssueCodes).toEqual(["invalid_type"])
  })
})

// ---------------------------------------------------------------------------
// Cenário 8 — truncagem: >20 issues.
// ---------------------------------------------------------------------------
describe("classifier — truncagem em MAX_ZOD_ISSUES_CAPTURED (20)", () => {
  it("issueCount mostra total, mas arrays limitam a 20", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    // 25 campos obrigatórios; input vazio → 25 issues.
    const shape: Record<string, z.ZodType> = {}
    for (let i = 0; i < 25; i++) shape[`f${i}`] = z.string()
    const schema = z.object(shape)
    const zodErr = zodErrorFrom(schema, {})
    const wrapped = wrapAsNoObject(zodErr)
    const result = classifyErrorForTests(wrapped)
    expect(result.diagnostic?.zodIssueCount).toBe(25)
    expect(result.diagnostic?.zodIssuePaths?.length).toBe(20)
    expect(result.diagnostic?.zodIssueCodes?.length).toBe(20)
    expect(result.diagnostic?.zodIssueExpected?.length).toBe(20)
    expect(result.diagnostic?.zodIssueReceivedType?.length).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// Cenário 9 — sem ZodError na chain: campos ficam undefined.
// ---------------------------------------------------------------------------
describe("classifier — sem ZodError na chain", () => {
  it("erro genérico sem cause=ZodError não popula campos zod*", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    class APICallError extends Error {
      override name = "APICallError"
      statusCode = 500
    }
    const result = classifyErrorForTests(new APICallError("boom"))
    expect(result.diagnostic?.zodIssueCount).toBeUndefined()
    expect(result.diagnostic?.zodIssuePaths).toBeUndefined()
    expect(result.diagnostic?.zodIssueCodes).toBeUndefined()
    expect(result.diagnostic?.zodIssueExpected).toBeUndefined()
    expect(result.diagnostic?.zodIssueReceivedType).toBeUndefined()
  })

  it("NoObjectGenerated sem cause=ZodError também deixa zod* undefined", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    class NoObjectGeneratedError extends Error {
      override name = "AI_NoObjectGeneratedError"
    }
    const result = classifyErrorForTests(new NoObjectGeneratedError("boom"))
    expect(result.code).toBe("STRUCTURED_OUTPUT_INVALID")
    expect(result.diagnostic?.zodIssueCount).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Cenário 10 — Sanitização defensiva: garante que valor concreto NUNCA vaza.
// ---------------------------------------------------------------------------
describe("classifier — ZodError não vaza issue.input nem issue.message", () => {
  it("valor do input do modelo não aparece no diagnostic", () => {
    process.env.ATENIS_PROVIDER_DIAGNOSTIC = "true"
    const schema = z.object({
      studentName: z.string().min(50),
      pii: z.string().url(),
    })
    const secretName = "SENSITIVE_STUDENT_PII_XPTO"
    const secretPii = "not-a-url-CONFIDENTIAL"
    const zodErr = zodErrorFrom(schema, {
      studentName: secretName,
      pii: secretPii,
    })
    const wrapped = wrapAsNoObject(zodErr)
    const result = classifyErrorForTests(wrapped)
    const asJson = JSON.stringify(result.diagnostic)
    expect(asJson).not.toContain(secretName)
    expect(asJson).not.toContain(secretPii)
    expect(asJson).not.toContain("SENSITIVE")
    expect(asJson).not.toContain("CONFIDENTIAL")
    expect(asJson).not.toContain("XPTO")
    // Também não pode conter mensagem gerada pelo Zod que ecoa o valor
    // (ex: 'Expected string, received number' em outro locale poderia
    // interpolar o valor).
    expect(asJson).not.toContain("received number")
  })
})

// ---------------------------------------------------------------------------
// Cenário 11 — Gate opt-in: sem ATENIS_PROVIDER_DIAGNOSTIC, nada é
// capturado (nem os campos zod*).
// ---------------------------------------------------------------------------
describe("classifier — gate opt-in vale pra campos zod* também", () => {
  it("sem env, diagnostic é undefined mesmo com ZodError", () => {
    delete process.env.ATENIS_PROVIDER_DIAGNOSTIC
    const schema = z.object({ x: z.string() })
    const zodErr = zodErrorFrom(schema, { x: 1 })
    const wrapped = wrapAsNoObject(zodErr)
    const result = classifyErrorForTests(wrapped)
    expect(result.code).toBe("STRUCTURED_OUTPUT_INVALID")
    expect(result.diagnostic).toBeUndefined()
  })
})
