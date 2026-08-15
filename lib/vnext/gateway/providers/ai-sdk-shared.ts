// lib/vnext/gateway/providers/ai-sdk-shared.ts
//
// Helpers compartilhados por providers que usam AI SDK v5 (`ai` package)
// — hoje `VercelAIGatewayProvider` e `OpenAIProvider`. Ambos:
//   - convertem `ChatMessage[]` em `{system, prompt}` do AI SDK;
//   - extraem `usage` normalizado (v5 usa camelCase; alguns providers
//     devolvem snake_case);
//   - classificam erros do AI SDK v5 em códigos curtos + diagnostic
//     sanitizado (metadata técnica; NUNCA prompt/response/apiKey).
//
// PRINCÍPIOS:
//   - Diagnostic só é populado quando `ATENIS_PROVIDER_DIAGNOSTIC=true`.
//   - `errorCodeFromSdk`, `urlHost`, `urlPath` (sem query) e
//     `causeChain` (só nomes de classe) — nada de mensagem crua.

import type { ChatMessage } from "../types"
import type { ProviderInvocationDiagnostic } from "../errors"
import { ProviderInvocationError } from "../errors"

// -----------------------------------------------------------------------
// MESSAGES → PROMPT
// -----------------------------------------------------------------------

export function messagesToPrompt(messages: ChatMessage[]): {
  system?: string
  prompt: string
} {
  const systems = messages.filter((m) => m.role === "system").map((m) => m.content)
  const others = messages.filter((m) => m.role !== "system")
  const system = systems.length > 0 ? systems.join("\n\n") : undefined
  const prompt = others.map((m) => m.content).join("\n\n")
  return { system, prompt }
}

// -----------------------------------------------------------------------
// USAGE (normalizado)
// -----------------------------------------------------------------------

export function usageFromSdk(raw: unknown):
  | { promptTokens?: number; completionTokens?: number }
  | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const u = raw as Record<string, unknown>
  const promptTokens =
    typeof u.promptTokens === "number"
      ? u.promptTokens
      : typeof u.prompt_tokens === "number"
        ? u.prompt_tokens
        : typeof u.inputTokens === "number"
          ? u.inputTokens
          : undefined
  const completionTokens =
    typeof u.completionTokens === "number"
      ? u.completionTokens
      : typeof u.completion_tokens === "number"
        ? u.completion_tokens
        : typeof u.outputTokens === "number"
          ? u.outputTokens
          : undefined
  if (promptTokens === undefined && completionTokens === undefined) return undefined
  return { promptTokens, completionTokens }
}

// -----------------------------------------------------------------------
// ERROR CLASSIFICATION
// -----------------------------------------------------------------------

// Taxonomia AI SDK v5:
//   APICallError — request HTTP com status !== 2xx (tem statusCode)
//   NoObjectGeneratedError — generateObject não conseguiu produzir objeto
//   TypeValidationError, JSONParseError — sub-tipos
//   InvalidPromptError, InvalidResponseDataError
//   RetryError — retries esgotaram
//   AbortError / TimeoutError
//   Erros nativos (fetch failed, ECONNRESET, ETIMEDOUT)
//   Gateway-specific: GatewayAuthenticationError, GatewayRateLimitError,
//                     GatewayModelNotFoundError, GatewayInternalServerError
export function classifyAiSdkError(err: unknown): ProviderInvocationError {
  const props = extractErrorProps(err)
  const cls = props.errorClass ?? ""
  const name = props.errorName ?? ""
  const combined = `${cls}|${name}`
  const status = props.statusCode

  const diagnosticEnabled =
    // eslint-disable-next-line no-process-env
    process.env.ATENIS_PROVIDER_DIAGNOSTIC === "true"
  const diagnostic = diagnosticEnabled ? props : undefined

  // 1. Erros nomeados do Vercel Gateway (têm precedência — nome carrega
  //    a semântica mesmo quando statusCode não é exposto)
  if (/GatewayAuthentication/i.test(combined)) {
    return new ProviderInvocationError(
      "AUTHENTICATION_FAILED",
      "Gateway rejeitou a credencial. Verifique env var e permissões do workspace.",
      diagnostic,
    )
  }
  if (/GatewayRateLimit/i.test(combined)) {
    return new ProviderInvocationError(
      "RATE_LIMITED",
      "Gateway retornou rate limit.",
      diagnostic,
    )
  }
  if (/GatewayModelNotFound/i.test(combined)) {
    return new ProviderInvocationError(
      "MODEL_NOT_FOUND",
      "Modelo não encontrado no Gateway.",
      diagnostic,
    )
  }
  if (/GatewayInternalServer|GatewayUpstream/i.test(combined)) {
    return new ProviderInvocationError(
      "PROVIDER_UPSTREAM_ERROR",
      "Gateway upstream/internal error.",
      diagnostic,
    )
  }

  // 2. HTTP genérico com statusCode
  if (
    /APICallError|APIError|HTTPError/i.test(combined) ||
    status !== undefined
  ) {
    if (status === 401 || status === 403) {
      return new ProviderInvocationError(
        "AUTHENTICATION_FAILED",
        "Credencial rejeitada pelo provider. Verifique env var.",
        diagnostic,
      )
    }
    if (status === 404) {
      return new ProviderInvocationError(
        "MODEL_NOT_FOUND",
        "Rota/modelo não encontrado. Verifique modelId.",
        diagnostic,
      )
    }
    if (status === 400 || status === 422) {
      return new ProviderInvocationError(
        "INVALID_REQUEST",
        "Provider rejeitou o request (400/422). Provável incompatibilidade de payload/schema.",
        diagnostic,
      )
    }
    if (status === 429) {
      return new ProviderInvocationError(
        "RATE_LIMITED",
        "Provider retornou rate limit (429).",
        diagnostic,
      )
    }
    if (status && status >= 500) {
      return new ProviderInvocationError(
        "PROVIDER_UPSTREAM_ERROR",
        `Provider retornou ${status}.`,
        diagnostic,
      )
    }
    return new ProviderInvocationError(
      "PROVIDER_HTTP_ERROR",
      `Provider retornou erro HTTP${status ? ` ${status}` : ""}.`,
      diagnostic,
    )
  }

  // 3. Erros específicos de generateObject
  if (/NoObjectGenerated/i.test(combined)) {
    return new ProviderInvocationError(
      "STRUCTURED_OUTPUT_INVALID",
      "generateObject não conseguiu produzir objeto válido. Provável incompatibilidade schema ↔ modelo.",
      diagnostic,
    )
  }
  if (/TypeValidation|JSONParse/i.test(combined)) {
    return new ProviderInvocationError(
      "STRUCTURED_VALIDATION_FAILED",
      "Provider devolveu payload que não bate no schema declarado.",
      diagnostic,
    )
  }
  if (/InvalidPrompt|InvalidResponseData/i.test(combined)) {
    return new ProviderInvocationError(
      "INVALID_REQUEST",
      "SDK considerou prompt/response inválidos antes do provider processar.",
      diagnostic,
    )
  }
  if (/Retry/i.test(combined)) {
    return new ProviderInvocationError(
      "PROVIDER_TIMEOUT",
      "Retries do SDK esgotaram. Provider possivelmente instável.",
      diagnostic,
    )
  }
  if (/Timeout|Abort/i.test(combined)) {
    return new ProviderInvocationError(
      "PROVIDER_TIMEOUT",
      "Provider excedeu timeout.",
      diagnostic,
    )
  }

  // 4. Erros de rede nativos
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(combined)) {
    return new ProviderInvocationError(
      "NETWORK_ERROR",
      "Falha de rede antes de receber resposta do provider.",
      diagnostic,
    )
  }

  return new ProviderInvocationError(
    "PROVIDER_UNKNOWN_ERROR",
    "Erro não classificado do provider.",
    diagnostic,
  )
}

// -----------------------------------------------------------------------
// ERROR PROPS EXTRACTOR (sanitizado)
// -----------------------------------------------------------------------

export function extractErrorProps(err: unknown): ProviderInvocationDiagnostic {
  const out: ProviderInvocationDiagnostic = {}
  if (!err || typeof err !== "object") return out
  const e = err as Record<string, unknown>
  const ctor = (err as { constructor?: { name?: unknown } }).constructor
  if (ctor && typeof ctor.name === "string") out.errorClass = ctor.name
  if (typeof e.name === "string") out.errorName = e.name
  if (typeof e.statusCode === "number") out.statusCode = e.statusCode
  else if (typeof e.status === "number") out.statusCode = e.status
  if (typeof e.statusText === "string" && e.statusText.length < 100) {
    out.statusText = e.statusText
  }
  if (typeof e.code === "string" && e.code.length < 100) {
    out.errorCodeFromSdk = e.code
  }
  if (typeof e.url === "string") {
    try {
      const u = new URL(e.url)
      out.urlHost = u.host
      out.urlPath = u.pathname
    } catch {
      /* url malformada — ignora */
    }
  }
  if (typeof e.isRetryable === "boolean") out.isRetryable = e.isRetryable

  // Cause imediata (nível 1) — separada em name + class pra distinguir
  // JSONParseError vs TypeValidationError dentro de NoObjectGeneratedError.
  const immediateCause = e.cause
  if (immediateCause && typeof immediateCause === "object") {
    const causeObj = immediateCause as Record<string, unknown>
    if (typeof causeObj.name === "string" && causeObj.name.length < 100) {
      out.causeName = causeObj.name
    }
    const causeCtor = (immediateCause as { constructor?: { name?: unknown } })
      .constructor
    if (causeCtor && typeof causeCtor.name === "string") {
      out.causeClass = causeCtor.name
    }
  }

  // Cause chain — nunca a mensagem, só a classe de cada nível.
  const chain: string[] = []
  let current: unknown = e.cause
  let depth = 0
  while (current && typeof current === "object" && depth < 5) {
    const c = (current as { constructor?: { name?: unknown } }).constructor
    if (c && typeof c.name === "string") chain.push(c.name)
    current = (current as { cause?: unknown }).cause
    depth++
  }
  if (chain.length > 0) out.causeChain = chain

  // ── LLM response metadata (presente em NoObjectGeneratedError e afins).
  //    Nada disso é conteúdo textual do prompt/resposta — só sinais.

  if (typeof e.finishReason === "string" && e.finishReason.length < 40) {
    out.finishReason = e.finishReason
  }

  const usage = e.usage
  if (usage && typeof usage === "object") {
    const u = usage as Record<string, unknown>
    // AI SDK v5 usa inputTokens/outputTokens/totalTokens; provider antigo
    // podia usar promptTokens/completionTokens. Aceitamos ambos.
    const inputT =
      typeof u.inputTokens === "number"
        ? u.inputTokens
        : typeof u.promptTokens === "number"
          ? u.promptTokens
          : undefined
    const outputT =
      typeof u.outputTokens === "number"
        ? u.outputTokens
        : typeof u.completionTokens === "number"
          ? u.completionTokens
          : undefined
    if (typeof inputT === "number") out.promptTokens = inputT
    if (typeof outputT === "number") out.completionTokens = outputT
    if (typeof u.totalTokens === "number") out.totalTokens = u.totalTokens
  }

  const response = e.response
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>
    // response.id é um opaque server-side id (ex: "chatcmpl-*"). Aceito
    // só se string curta — evita capturar acidentalmente algum body
    // grande que o provider tenha grudado aqui. Ainda: se parecer chave
    // (começa com "sk-", "Bearer ", etc.), REJEITAMOS por precaução.
    if (typeof r.id === "string" && r.id.length > 0 && r.id.length < 200) {
      const idLower = r.id.toLowerCase()
      const looksLikeSecret =
        idLower.startsWith("sk-") ||
        idLower.startsWith("bearer ") ||
        idLower.startsWith("basic ") ||
        idLower.includes("api_key") ||
        idLower.includes("apikey")
      if (!looksLikeSecret) out.responseId = r.id
    }
    // response.headers NUNCA — pode conter Authorization/apiKey echoed
    // ou Set-Cookie com sessão. Ignoramos deliberadamente.
  }

  // text.length — sinal de quanto o modelo escreveu antes de falhar.
  // Conteúdo em si NUNCA é capturado.
  if (typeof e.text === "string") {
    out.textLength = e.text.length
  }

  // RetryError: reason + errors.length. Ambos são sinal de repair loop.
  if (typeof e.reason === "string" && e.reason.length < 60) {
    out.retryReason = e.reason
  }
  if (Array.isArray(e.errors)) {
    out.retryCount = e.errors.length
  }

  // ZodError issues (Fase 2B.5-diag Alt 2). Desce no causeChain até 5
  // níveis procurando um objeto que se pareça com ZodError (tem
  // .issues[] com {code, path}). Extrai APENAS metadata estrutural,
  // NUNCA o valor recebido (`issue.input`) nem `issue.message`.
  const zodErr = findZodErrorInChain(err)
  if (zodErr) {
    extractZodIssuesInto(zodErr, out)
  }

  return out
}

// -----------------------------------------------------------------------
// ZOD ISSUE EXTRACTION (sanitizado)
// -----------------------------------------------------------------------

// Limite de issues capturadas. Zod schemas complexos podem gerar dezenas
// — mais que isso vira ruído, e a explosão em arrays pode inflar log.
const MAX_ZOD_ISSUES_CAPTURED = 20

// Segmento de path aceito: identificador JS válido OU número puro (índice
// de array). Símbolo/objeto/string estranha vira "?". Isso NUNCA revela
// valor do input do modelo — só estrutura do schema.
const PATH_SEGMENT_ALLOWED = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function looksLikeZodError(x: unknown): x is { issues: unknown[] } {
  if (!x || typeof x !== "object") return false
  const obj = x as { issues?: unknown; name?: unknown; constructor?: { name?: unknown } }
  if (!Array.isArray(obj.issues)) return false
  // Heurística adicional: nome sugere ZodError. Evita capturar arrays
  // `.issues` acidentais de outros tipos (ex: NoObjectGeneratedError
  // NÃO tem .issues, mas se algum dia tiver, essa checagem previne).
  const nameHint =
    (typeof obj.name === "string" && /ZodError/i.test(obj.name)) ||
    (obj.constructor &&
      typeof obj.constructor.name === "string" &&
      /ZodError/i.test(obj.constructor.name))
  if (!nameHint) return false
  // Cada issue deve ter shape mínimo { code, path } — ou pelo menos uma.
  const first = obj.issues[0]
  if (!first || typeof first !== "object") return true // array vazio ainda é válido
  const fi = first as { code?: unknown; path?: unknown }
  return typeof fi.code === "string" || Array.isArray(fi.path)
}

function findZodErrorInChain(err: unknown): { issues: unknown[] } | null {
  let current: unknown = err
  let depth = 0
  while (current && typeof current === "object" && depth < 6) {
    if (looksLikeZodError(current)) return current
    current = (current as { cause?: unknown }).cause
    depth++
  }
  return null
}

function sanitizePathSegment(seg: unknown): string {
  if (typeof seg === "number" && Number.isFinite(seg)) return String(seg)
  if (typeof seg === "string" && PATH_SEGMENT_ALLOWED.test(seg)) return seg
  return "?"
}

function sanitizePath(path: unknown): string {
  if (!Array.isArray(path) || path.length === 0) return "(root)"
  const segments = path.map(sanitizePathSegment)
  const joined = segments.join(".")
  return joined.length > 200 ? `${joined.slice(0, 200)}…` : joined
}

function extractExpected(issue: Record<string, unknown>): string {
  // Ordem: expected (invalid_type) > origin (too_*) > format (invalid_format).
  //   NÃO extraímos `values[]` de invalid_value (pode conter valor concreto).
  //   NÃO extraímos `keys[]` de unrecognized_keys aqui (feito no path).
  if (typeof issue.expected === "string" && issue.expected.length < 60) {
    return issue.expected
  }
  if (typeof issue.origin === "string" && issue.origin.length < 60) {
    return issue.origin
  }
  if (typeof issue.format === "string" && issue.format.length < 60) {
    return issue.format
  }
  return "-"
}

function extractReceivedType(issue: Record<string, unknown>): string {
  // typeof no `input` — nunca o valor. Array vira "array" pra distinguir.
  if (!("input" in issue)) return "-"
  const input = issue.input
  if (input === null) return "null"
  if (Array.isArray(input)) return "array"
  return typeof input // "string" | "number" | "boolean" | "object" | "undefined" | ...
}

function extractZodIssuesInto(
  zodErr: { issues: unknown[] },
  out: ProviderInvocationDiagnostic,
): void {
  const issues = zodErr.issues
  out.zodIssueCount = issues.length

  const paths: string[] = []
  const codes: string[] = []
  const expected: string[] = []
  const receivedType: string[] = []

  const capped = issues.slice(0, MAX_ZOD_ISSUES_CAPTURED)
  for (const raw of capped) {
    if (!raw || typeof raw !== "object") continue
    const issue = raw as Record<string, unknown>
    paths.push(sanitizePath(issue.path))
    const code =
      typeof issue.code === "string" && issue.code.length < 60
        ? issue.code
        : "-"
    codes.push(code)
    expected.push(extractExpected(issue))
    receivedType.push(extractReceivedType(issue))
  }

  out.zodIssuePaths = paths
  out.zodIssueCodes = codes
  out.zodIssueExpected = expected
  out.zodIssueReceivedType = receivedType
}
