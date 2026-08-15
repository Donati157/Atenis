# Vercel AI Gateway — decisão arquitetural

**Status:** preparação (stub implementado). Provider REAL não ativado.

## Decisão

Vercel AI Gateway é tratado como **um Provider concreto** na nossa
taxonomia — não como substituto do nosso `AIGateway` interno.

```
Atenis Runtime
    ↓
lib/vnext/gateway/index.ts (AIGateway — nosso, agnóstico)
    ↓
VercelAIGatewayProvider (implements AIProvider)
    ↓
Vercel AI Gateway (infra)
    ↓
modelo (openai/gpt-4o, anthropic/claude-3.5-sonnet, ...)
```

## Por que manter os dois

| Camada | Responsabilidade |
|---|---|
| Nosso `AIGateway` | Provider-agnostic. Swap Mock↔Real. Roteamento por `metadata.providerId`. Telemetria opcional. |
| `VercelAIGatewayProvider` | Implementação concreta de UM provider. Config (`modelId`, `apiKeyEnvVar`, `baseUrl`). |
| Vercel AI Gateway | Infra dele: rate limit, roteamento entre modelos, contabilidade. |

Se removermos nossa camada, `Runtime` importa `VercelAIGatewayProvider`
direto — vira Vercel-aware. Perdemos o swap Mock↔Real determinístico.

## Sobre "critique" como primitiva

**Não.** Nosso `Critic` é pipeline separada (regras Zod determinísticas
+ validators + Critic-LLM opcional). Se um dia quisermos Critic-LLM,
ele é USECASE em cima de `structured`, não uma primitiva do Gateway.

## Primitivas do Provider

`complete` / `stream` / `structured`. Bastam.

- `complete`: input → texto único.
- `stream`: input → sequência de chunks.
- `structured`: input + Zod schema → objeto validado. **Zod valida
  SEMPRE, mesmo que o SDK ofereça `generateObject` — não confiar só no
  SDK.**

## Modelo é PARÂMETRO do Provider, não do Runtime

Runtime nunca escolhe modelo. Se quisermos "modelo barato pra diagnose
e modelo caro pra correção", registramos DOIS `VercelAIGatewayProvider`
com `providerId` diferentes e o Runtime roteia via
`input.metadata.providerId`.

## Retries — duas camadas SEPARADAS

- **Provider interno / SDK**: retry por transient (rate limit, timeout,
  502, connection reset). SDK do Vercel já faz.
- **Runtime → Critic refine**: retry PEDAGÓGICO com feedback
  estruturado do Critic. Já existe. NÃO misturar.

## Credencial

**NUNCA no código, no repo, ou em fixture.** O Provider armazena o
NOME da variável de ambiente (`AI_GATEWAY_API_KEY` por default). Só na
implementação REAL do path ativado é que `process.env[apiKeyEnvVar]`
é lido.

Se o nome esperado pelo SDK for outro (ex: `AI_GATEWAY_TOKEN`), o
Provider precisa ser instanciado passando `apiKeyEnvVar` explícito.
Verificar documentação oficial do Vercel AI Gateway antes de ativar.

## Observabilidade

`ProviderTelemetry.onOperation(record)` opcional no `createGateway({telemetry})`.
Records incluem: providerId, modelId, operation, useCase, latencyMs,
status, attemptCount, usage (opcional), costUsd (opcional), errorCode
(opcional).

**NUNCA incluir prompt/response literais.** Só metadata operacional.

## O que vai mudar na ativação

1. Adicionar dependência `ai` do Vercel se não estiver presente.
2. `VercelAIGatewayProvider.assertActivated()` deixa de lançar; passa a
   invocar `generateText`/`streamText`/`generateObject` do AI SDK.
3. `structured<T>` valida com Zod O RESULTADO do SDK — Zod é a
   AUTORIDADE, não o SDK.
4. `stream` mapeia `text-delta` events do SDK pra nosso `StreamChunk`.
5. Erros do SDK viram códigos classificados (`RATE_LIMITED`,
   `PROVIDER_TIMEOUT`, ...) via `catch/rethrow` — nunca vazar mensagem
   crua no `errorCode` da telemetria.

## O que NÃO fazer na ativação

- Chamar Vercel dentro dos testes existentes. Testes continuam usando
  MockProvider. Novos testes de smoke (real) ficam em suite separada
  (ex: `test/vnext/smoke-real/`) e opt-in via env var.
- Compartilhar Provider entre requests sem cuidado com concorrência.
- Skip da validação Zod em `structured` — mesmo que o SDK "garanta".
