# OpenAI direto — provider principal (Fase 2B.3+)

**Status:** ativo. Provider principal desta fase é `OpenAIProvider`
(chamada direta à OpenAI via `@ai-sdk/openai@^2`).

## Decisão

`OpenAIProvider` é o provider REAL usado pelo Atenis vNext nesta fase.

## Por que não Vercel AI Gateway agora

Testes reais de 2026-08-14 confirmaram que o Vercel AI Gateway, no
workspace atual, retorna `403 GatewayAuthenticationError` em requests
de generation, apesar de:

- `GET /v1/models` responder `200` com todos os 328 modelos listados
  (`openai/gpt-4o-mini` incluído).
- Chave nova ter reproduzido o mesmo erro.
- `AI Gateway → Logs` NÃO mostrar as requisições no período (rejeição
  em camada de entitlement/policy antes do log).

Isso indica bloqueio de acesso/entitlement do workspace no lado do
Vercel — não é problema de código, chave ou modelId. Enquanto o
suporte Vercel não resolve, seguimos direto na OpenAI.

## Por que MANTEMOS `VercelAIGatewayProvider`

- Nenhum código do Runtime foi acoplado à escolha atual. Volta com
  1 linha de configuração.
- Se o Vercel Gateway destravar (BYOK OpenAI configurado, provider
  habilitado no dashboard, ou correção de suporte), podemos voltar
  imediatamente ganhando: (a) monitoramento centralizado no dashboard
  Vercel, (b) fallback entre providers, (c) BYOK unificado.
- Também mantemos telemetria comum via `AIGateway.telemetry` —
  independe do provider concreto.

## Contrato inalterado

Runtime, Method Engine, Critic, Evaluator, Question Bank, MockProvider
**não sabem** que o provider concreto mudou. Todos continuam
consumindo `AIProvider` via `AIGateway`.

## Configuração atual

- **Env var**: `OPENAI_API_KEY` (default do `OpenAIProvider`;
  configurável via `apiKeyEnvVar`).
- **Model ID default do smoke**: `gpt-4o-mini`. Configurável via
  `ATENIS_SMOKE_MODEL_ID`. Continua sendo BASELINE TÉCNICO, não
  escolha pedagógica definitiva.
- **Ativação**: `activated: true` no constructor do `OpenAIProvider`
  registrado no `AIGateway` do smoke.

## Retorno pra Vercel AI Gateway (quando destravar)

Dois pontos:
1. No smoke ou no código de produção que instancia o Gateway, trocar
   `new OpenAIProvider(...)` por `new VercelAIGatewayProvider({modelId:
   "openai/gpt-4o-mini", activated: true, ...})`.
2. Env var esperada muda pra `AI_GATEWAY_API_KEY`.

Zero mudança em Runtime, Critic, Evaluator, QuestionBank, Method
Engine, TutorTurnComposer, analyzeTurn.
