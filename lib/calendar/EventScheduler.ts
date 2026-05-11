/**
 * "Algoritmos" de alto nível que combinam EventList + CalendarGrid.
 *
 * Conceitos AP CS A:
 *  - Unit 4 + 7 (Iteration + ArrayList): traverse, busca linear, contagem.
 *  - Unit 7 (Sorting): demonstra Insertion Sort por data, alternativa
 *    à Selection Sort que está em EventList.
 *  - Unit 10 (Recursion): countEventsRecursive faz a contagem de eventos
 *    recursivamente, espelhando o estilo dos exercícios de FRQ recursivos.
 *  - Unit 5 (Static methods): tudo aqui é estático — esta é uma
 *    "utility class" no estilo Math do Java.
 */

import { CalendarEvent } from "./CalendarEvent"
import { EventList } from "./EventList"

export class EventScheduler {
  // Unit 7: Insertion Sort — outro algoritmo do CED.
  // Cada iteração pega o elemento da posição i e o "encaixa" na sub-lista
  // ordenada à esquerda.
  public static insertionSortByDate(list: EventList): void {
    const n = list.size()
    for (let i = 1; i < n; i++) {
      const key = list.get(i)
      let j = i - 1
      while (j >= 0 && list.get(j).compareDate(key) > 0) {
        list.set(j + 1, list.get(j))
        j--
      }
      list.set(j + 1, key)
    }
  }

  // Unit 10: Recursão — conta quantos eventos existem na lista a partir
  // do índice `start`. Caso base: índice fora do array. Caso recursivo:
  // 1 + chamada para o índice seguinte. É um clássico de FRQ.
  public static countEventsRecursive(
    list: EventList,
    start = 0,
  ): number {
    if (start >= list.size()) return 0
    return 1 + EventScheduler.countEventsRecursive(list, start + 1)
  }

  // Unit 10: Recursão com filtro — conta quantos eventos caem em uma
  // categoria específica. Caso base + chamada com índice seguinte
  // somando 0 ou 1 dependendo da condição.
  public static countByCategoryRecursive(
    list: EventList,
    category: CalendarEvent["getCategory"] extends () => infer R ? R : never,
    start = 0,
  ): number {
    if (start >= list.size()) return 0
    const head = list.get(start).getCategory() === category ? 1 : 0
    return head + EventScheduler.countByCategoryRecursive(list, category, start + 1)
  }

  // Unit 4: traverse linear para encontrar o próximo evento futuro.
  // Pré-condição: lista ordenada por data.
  public static nextUpcoming(
    sorted: EventList,
    now: Date = new Date(),
  ): CalendarEvent | null {
    const t = now.getTime()
    for (let i = 0; i < sorted.size(); i++) {
      const ev = sorted.get(i)
      if (ev.getDate().getTime() >= t) return ev
    }
    return null
  }

  // Unit 4 + 7: agrupa eventos por dia para a renderização do mês.
  // Retorna um Map<chave do dia, EventList>.
  public static groupByDay(list: EventList): Map<string, EventList> {
    const map = new Map<string, EventList>()
    for (const ev of list.toArray()) {
      const d = ev.getDate()
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, new EventList())
      map.get(key)!.add(ev)
    }
    return map
  }

  // Helper: chave consistente para indexar Map<string, EventList>.
  public static dayKey(year: number, month: number, day: number): string {
    return `${year}-${month}-${day}`
  }
}
