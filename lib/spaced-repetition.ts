// lib/spaced-repetition.ts
//
// Lógica pura do sistema Leitner de repetição espaçada usado pela
// "memória acadêmica" do Atenis. Sem dependência de DB/IO — só funções
// determinísticas, fáceis de testar.
//
// Como funciona: cada (matéria, tópico) que o aluno estuda vive numa
// "caixa" de 1 a 5. Acertou → sobe de caixa (próxima revisão fica mais
// distante). Errou → volta pra caixa 1 (revisa logo). O intervalo até a
// próxima revisão cresce conforme a caixa.

// Intervalo de revisão por caixa, em dias. Caixa 1 revisa amanhã;
// caixa 5 só daqui ~5 semanas (tópico já consolidado).
export const BOX_INTERVALS_DAYS: readonly number[] = [1, 3, 7, 16, 35]

export const MIN_BOX = 1
export const MAX_BOX = 5

// Próxima caixa depois de uma tentativa.
// Acertou → sobe 1 (até o teto). Errou → volta pra caixa 1.
export function nextBox(currentBox: number, correct: boolean): number {
  const box = clampBox(currentBox)
  if (!correct) return MIN_BOX
  return Math.min(box + 1, MAX_BOX)
}

// Quantos dias até a próxima revisão, dada a caixa.
export function intervalDaysForBox(box: number): number {
  return BOX_INTERVALS_DAYS[clampBox(box) - 1]
}

// Data da próxima revisão a partir de uma data base (default: agora).
export function nextReviewDate(box: number, from: Date = new Date()): Date {
  const days = intervalDaysForBox(box)
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d
}

// Domínio normalizado 0..1 a partir da caixa (caixa 5 = 1.0).
export function masteryFromBox(box: number): number {
  return clampBox(box) / MAX_BOX
}

// Domínio em porcentagem inteira (0..100), pra exibir na UI.
export function masteryPercent(box: number): number {
  return Math.round(masteryFromBox(box) * 100)
}

// Um tópico está "vencido" (due) pra revisão se a próxima revisão já
// passou em relação a `now`.
export function isDue(nextReview: Date | string, now: Date = new Date()): boolean {
  const nr = typeof nextReview === "string" ? new Date(nextReview) : nextReview
  return nr.getTime() <= now.getTime()
}

function clampBox(box: number): number {
  if (Number.isNaN(box)) return MIN_BOX
  return Math.max(MIN_BOX, Math.min(MAX_BOX, Math.round(box)))
}

// Aplica uma tentativa a um estado de domínio e devolve o novo estado.
// Usado pelo endpoint /api/mastery ao registrar acerto/erro.
export interface MasteryState {
  box: number
  timesSeen: number
  timesCorrect: number
  lastSeen: Date
  nextReview: Date
}

export function applyAttempt(
  prev: Pick<MasteryState, "box" | "timesSeen" | "timesCorrect"> | null,
  correct: boolean,
  now: Date = new Date(),
): MasteryState {
  const currentBox = prev?.box ?? MIN_BOX
  const box = nextBox(currentBox, correct)
  return {
    box,
    timesSeen: (prev?.timesSeen ?? 0) + 1,
    timesCorrect: (prev?.timesCorrect ?? 0) + (correct ? 1 : 0),
    lastSeen: now,
    nextReview: nextReviewDate(box, now),
  }
}
