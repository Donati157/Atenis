// lib/vnext/gateway/errors.ts
//
// Erros específicos da camada de Gateway/Provider. Classes concretas
// facilitam testes ("expect fn to throw ProviderNotRegisteredError")
// e roteamento de tratamento na camada de cima.

export class ProviderNotRegisteredError extends Error {
  readonly code = "PROVIDER_NOT_REGISTERED"
  constructor(providerId: string) {
    super(
      `Nenhum provider registrado com id "${providerId}". Registre com gateway.register() antes de usar.`,
    )
    this.name = "ProviderNotRegisteredError"
  }
}

export class NoDefaultProviderError extends Error {
  readonly code = "NO_DEFAULT_PROVIDER"
  constructor() {
    super(
      "Nenhum provider elegível como default está registrado. Registre ao menos um provider com capabilities.eligibleForDefault=true.",
    )
    this.name = "NoDefaultProviderError"
  }
}

export class MockFixtureNotFoundError extends Error {
  readonly code = "MOCK_FIXTURE_NOT_FOUND"
  constructor(hint: string) {
    super(
      `MockProvider não encontrou fixture pra esse input. Hint: ${hint}. Registre com mock.registerFixture(...) ou mock.registerMatcher(...) antes de chamar.`,
    )
    this.name = "MockFixtureNotFoundError"
  }
}

export class StructuredValidationError extends Error {
  readonly code = "STRUCTURED_VALIDATION_FAILED"
  constructor(
    public readonly zodIssues: unknown,
    public readonly attempts: number,
  ) {
    super(
      `Provider devolveu payload que não bate no schema depois de ${attempts} tentativa(s) de reparo.`,
    )
    this.name = "StructuredValidationError"
  }
}

// Preparação Vercel AI Gateway: Provider registrado mas ainda não
// ativado. Serve pra dev/prod carregar a config e falhar CLARO quando
// alguém tentar chamar. Sem esse erro, uma configuração incompleta
// silenciosamente cairia num `undefined is not a function` do SDK.
export class ProviderNotActivatedError extends Error {
  readonly code = "PROVIDER_NOT_ACTIVATED"
  constructor(providerId: string, detail?: string) {
    super(
      `Provider "${providerId}" está registrado mas com activated=false. ${detail ?? "Habilite explicitamente quando a integração real estiver pronta."}`,
    )
    this.name = "ProviderNotActivatedError"
  }
}

// Fase 2B.2: credencial ausente NO PONTO de invocação. NÃO expõe o
// valor esperado — só o NOME da env var faltando.
export class MissingCredentialError extends Error {
  readonly code = "MISSING_CREDENTIAL"
  constructor(envVarName: string) {
    super(
      `Env var "${envVarName}" não está setada. Configure-a antes de chamar o provider real.`,
    )
    this.name = "MissingCredentialError"
  }
}

// Fase 2B.2: erro classificado do SDK real. Mantém o código curto
// (rate-limit, timeout, malformed, etc.) e nunca vaza mensagem crua do
// provider. Diagnostic sanitizado é opcional — só populado quando o
// consumidor pediu explicitamente (ATENIS_PROVIDER_DIAGNOSTIC=true) e
// contém APENAS metadata técnica (nunca prompt/response/apiKey).
export interface ProviderInvocationDiagnostic {
  errorClass?: string // constructor.name da exception (APICallError etc.)
  errorName?: string // e.name — geralmente = errorClass no v5
  statusCode?: number
  statusText?: string // curto: "Not Found", "Unauthorized"
  errorCodeFromSdk?: string // .code do SDK (ex: "invalid_api_key")
  urlHost?: string // só hostname (sem path, sem query — evita vazar id/token na URL)
  urlPath?: string // só o pathname do endpoint, sem query
  isRetryable?: boolean
  causeChain?: string[] // nomes das exceptions no chain (constructor.name)
  hint?: string

  // ── Fase 2B.5-diag: metadata técnica adicional pra distinguir
  //    JSON parse fail vs. schema mismatch em NoObjectGeneratedError,
  //    e capturar sinais de custo/repair loop. NENHUM destes campos
  //    carrega prompt, response text ou credencial — só metadata.

  // Cause imediata (nível 1) — nome e classe SEPARADOS.
  //   e.name pode ter sido reescrito via Object.defineProperty (SDK v5
  //   costuma fazer isso). Capturamos ambos pra não perder informação
  //   sobre qual sub-erro (JSONParseError vs TypeValidationError) causou.
  causeName?: string
  causeClass?: string

  // Sinais de LLM response — presentes em NoObjectGeneratedError.
  finishReason?: string // enum: stop|length|content-filter|tool-calls|error|other|unknown
  promptTokens?: number // = inputTokens no V2Usage
  completionTokens?: number // = outputTokens no V2Usage
  totalTokens?: number
  responseId?: string // opaque id (ex: chatcmpl-*). Só se string curta (< 200 chars) e sem parecer credencial.
  textLength?: number // LENGTH da resposta bruta, NUNCA o conteúdo

  // Sinais de repair/retry loop.
  retryCount?: number // = errors.length em RetryError
  retryReason?: string // enum: maxRetriesExceeded|errorNotRetryable|abort

  // ── Fase 2B.5-diag Alt 2: quando NoObjectGeneratedError.cause.cause
  //    (ou algum nível do causeChain) é um ZodError, extraímos sinais
  //    ESTRUTURAIS pra identificar QUAL constraint do schema violou —
  //    sem nunca capturar o valor recebido.

  zodIssueCount?: number // .issues.length (limitado a 20 nos arrays abaixo)
  zodIssuePaths?: string[] // ex: ["sources.0.url", "claims.0.evidenceIds"] — segmentos sanitizados
  zodIssueCodes?: string[] // ex: ["invalid_type", "too_small", "invalid_format"]
  zodIssueExpected?: string[] // "expected" (invalid_type), "origin" (too_*), "format" (invalid_format). "-" se ausente.
  zodIssueReceivedType?: string[] // typeof issue.input (com Array.isArray → "array"). NUNCA o valor.
}

export class ProviderInvocationError extends Error {
  readonly code: string
  readonly diagnostic?: ProviderInvocationDiagnostic
  constructor(
    code: string,
    message: string,
    diagnostic?: ProviderInvocationDiagnostic,
  ) {
    super(message)
    this.name = "ProviderInvocationError"
    this.code = code
    if (diagnostic) this.diagnostic = diagnostic
  }
}
