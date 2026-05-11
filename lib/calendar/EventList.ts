/**
 * Wrapper estilo ArrayList<CalendarEvent>.
 *
 * Conceitos AP CS A:
 *  - Unit 7 (ArrayList): add, remove, set, size, get — todos os métodos
 *    aparecem no CED e na prova. Aqui implementamos a interface usando
 *    um array nativo por baixo.
 *  - Unit 4 (Iteration): traverse for-each para filtrar (filterByDate)
 *    e para acumular (countByCategory).
 *  - Unit 7 (Sorting): selection sort O(n²) escrita "à mão" para casar
 *    com o que cai no exame, embora pudéssemos chamar Array#sort.
 *
 * Por que não usar Array nativo direto? Porque a ideia é mostrar a API
 * que o aluno vê no exame, e todo o resto do código consome essa API.
 */

import { CalendarEvent, type EventCategory } from "./CalendarEvent"

export class EventList {
  // Unit 7: a ArrayList por baixo dos panos é um array dinâmico.
  private items: CalendarEvent[]

  public constructor(initial: CalendarEvent[] = []) {
    this.items = [...initial] // defensive copy
  }

  // ───────── métodos da API ArrayList do AP CED ─────────

  public size(): number {
    return this.items.length
  }

  public isEmpty(): boolean {
    return this.items.length === 0
  }

  public get(index: number): CalendarEvent {
    if (index < 0 || index >= this.items.length) {
      throw new RangeError(`EventList.get: índice ${index} fora dos limites`)
    }
    return this.items[index]
  }

  public add(event: CalendarEvent): boolean {
    this.items.push(event)
    return true
  }

  public set(index: number, event: CalendarEvent): CalendarEvent {
    if (index < 0 || index >= this.items.length) {
      throw new RangeError(`EventList.set: índice ${index} fora dos limites`)
    }
    const old = this.items[index]
    this.items[index] = event
    return old
  }

  public remove(index: number): CalendarEvent {
    if (index < 0 || index >= this.items.length) {
      throw new RangeError(
        `EventList.remove: índice ${index} fora dos limites`,
      )
    }
    return this.items.splice(index, 1)[0]
  }

  // Unit 4 + 7: linear search por id.
  public removeById(id: string): boolean {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].getId() === id) {
        this.items.splice(i, 1)
        return true
      }
    }
    return false
  }

  public indexOfId(id: string): number {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].getId() === id) return i
    }
    return -1
  }

  // ───────── filtros & utilitários (consumidos pela UI) ─────────

  // Unit 4: traverse + cópia condicional.
  public filterByDate(year: number, month: number, day: number): EventList {
    const out = new EventList()
    for (const ev of this.items) {
      if (ev.isOnDate(year, month, day)) out.add(ev)
    }
    return out
  }

  // Unit 4: traverse + acumulador. Devolve dicionário por categoria.
  public countByCategory(): Record<EventCategory, number> {
    const counts: Record<EventCategory, number> = {
      study: 0,
      exam: 0,
      assignment: 0,
      school_day: 0,
    }
    for (const ev of this.items) {
      counts[ev.getCategory()]++
    }
    return counts
  }

  // Devolve o array nativo (cópia) — usado na UI quando React precisa.
  public toArray(): CalendarEvent[] {
    return [...this.items]
  }

  // Unit 7: Selection Sort por data (in place).
  // Algoritmo do CED: a cada passo, encontra o menor do "resto" e troca
  // com a posição corrente.
  public selectionSortByDate(): void {
    const n = this.items.length
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i
      for (let j = i + 1; j < n; j++) {
        if (this.items[j].compareDate(this.items[minIdx]) < 0) {
          minIdx = j
        }
      }
      if (minIdx !== i) {
        // swap
        const tmp = this.items[i]
        this.items[i] = this.items[minIdx]
        this.items[minIdx] = tmp
      }
    }
  }

  // Versão imutável para quando a UI quer uma lista ordenada sem
  // mexer na original.
  public sortedByDate(): CalendarEvent[] {
    const copy = new EventList(this.items)
    copy.selectionSortByDate()
    return copy.toArray()
  }
}
