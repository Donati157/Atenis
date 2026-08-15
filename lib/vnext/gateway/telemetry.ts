// lib/vnext/gateway/telemetry.ts
//
// Observabilidade opcional no AI Gateway.
//
// PRINCÍPIO: `OperationRecord` NUNCA inclui prompt/response literais.
// Só metadata operacional (provider, model, timing, status, tokens, cost
// quando disponível, erro quando aplicável). Isso é o que permite emitir
// pra logs/dashboards sem risco de vazar conteúdo de aluno.
//
// Uso:
//   const telemetry: ProviderTelemetry = { onOperation: (rec) => log(rec) }
//   const gateway = createGateway({ telemetry })
//
// Sem `telemetry`, o Gateway se comporta EXATAMENTE como antes — sem
// overhead, sem callbacks.

export type ProviderOperation = "complete" | "stream" | "structured"

export type OperationStatus = "success" | "failure"

export interface OperationRecord {
  providerId: string
  modelId: string
  operation: ProviderOperation
  useCase?: string
  latencyMs: number
  status: OperationStatus
  attemptCount: number
  // preenchido pelo provider quando disponível
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  // preenchido pelo provider quando disponível (USD, não centavos)
  costUsd?: number
  // erro classificado (código curto — nunca stack trace / mensagem crua)
  errorCode?: string
}

export interface ProviderTelemetry {
  onOperation(record: OperationRecord): void
}

// Telemetry no-op — útil como default e pra testes que querem confirmar
// que "callback foi chamado" sem lógica.
export const noopTelemetry: ProviderTelemetry = {
  onOperation() {
    /* deliberadamente vazio */
  },
}
