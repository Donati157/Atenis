// lib/vnext/clock.ts
//
// Clock injetável. Fase 1 evita `Date.now()` em código de produção e
// teste — se um caminho precisar de timestamp, PASSA um Clock. Isso é o
// que permite testes de determinismo passarem 20 execuções sem drift.

export interface Clock {
  now(): Date
  nowIso(): string
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
  nowIso(): string {
    return this.now().toISOString()
  }
}

// FakeClock avança em passos fixos (default 1s por chamada) a partir de
// um instante inicial ISO. Passos podem ser controlados pra teste
// específico via advance().
export class FakeClock implements Clock {
  private current: number
  private stepMs: number
  constructor(startIso = "2026-08-11T14:00:00.000Z", stepMs = 1000) {
    this.current = new Date(startIso).getTime()
    this.stepMs = stepMs
  }
  now(): Date {
    const d = new Date(this.current)
    this.current += this.stepMs
    return d
  }
  nowIso(): string {
    return this.now().toISOString()
  }
  peek(): string {
    return new Date(this.current).toISOString()
  }
  advance(ms: number): void {
    this.current += ms
  }
}
