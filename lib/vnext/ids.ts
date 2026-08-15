// lib/vnext/ids.ts
//
// Gerador de IDs injetável. Testes de determinismo usam CounterIdGenerator
// (produz "id-1", "id-2", ...); produção real usará algo baseado em
// UUID/crypto. Fase 1 só implementa Counter — provider real virá com o
// endpoint de produção.

export interface IdGenerator {
  next(prefix?: string): string
}

export class CounterIdGenerator implements IdGenerator {
  private counter = 0
  next(prefix = "id"): string {
    this.counter++
    return `${prefix}-${this.counter}`
  }
  reset(): void {
    this.counter = 0
  }
}
