/**
 * Grade do calendário (semanas × dias) — exatamente uma matriz 6×7.
 *
 * Conceitos AP CS A:
 *  - Unit 8 (2D Arrays): a grade é um int[][] em Java, ou
 *    DayCell[][] aqui. Acessamos via grid[row][col]; varremos com
 *    nested for. Isso é o coração da Unit 8.
 *  - Unit 4 (Iteration): nested loops para popular e renderizar.
 *  - Unit 1/2 (Primitive types, math): cálculo da primeira coluna usa
 *    Date.getDay() e aritmética de inteiros.
 *
 * Layout: linhas = semanas (0..5), colunas = dias da semana
 * (0=domingo, ..., 6=sábado). Padrão americano/brasileiro idêntico.
 */

export type DayCell = {
  // Os três campos abaixo identificam a data calendárica do slot.
  year: number
  month: number // 0-indexed (igual Date)
  day: number
  // Se este slot pertence ao mês corrente ou ao "spillover" (mês anterior
  // / posterior aparecendo nas bordas da grade).
  inMonth: boolean
}

export class CalendarGrid {
  // Unit 8: ARRAY 2D — semanas × dias da semana.
  private readonly cells: DayCell[][]
  private readonly year: number
  private readonly month: number // 0-indexed

  public constructor(year: number, month: number) {
    this.year = year
    this.month = month
    this.cells = CalendarGrid.build(year, month)
  }

  public getYear(): number {
    return this.year
  }
  public getMonth(): number {
    return this.month
  }

  // O AP gosta MUITO de "row-major traversal".
  public getCell(row: number, col: number): DayCell {
    return this.cells[row][col]
  }

  // Defensive copy do array 2D.
  public getCells(): DayCell[][] {
    return this.cells.map((row) => row.slice())
  }

  public getRowCount(): number {
    return this.cells.length
  }
  public getColCount(): number {
    return this.cells[0]?.length ?? 0
  }

  // Unit 4 + 8: nested loop para encontrar a célula de uma data.
  // Retorna [row, col] ou null. Demonstra "row-major search".
  public findCell(
    year: number,
    month: number,
    day: number,
  ): [number, number] | null {
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < this.cells[r].length; c++) {
        const cell = this.cells[r][c]
        if (
          cell.year === year &&
          cell.month === month &&
          cell.day === day
        ) {
          return [r, c]
        }
      }
    }
    return null
  }

  // Constrói a matriz 6×7 que sempre cobre o mês inteiro.
  // Lógica: começa no domingo da semana que contém o dia 1, e enche
  // 42 slots seguidos. Os slots fora do mês corrente recebem inMonth=false.
  private static build(year: number, month: number): DayCell[][] {
    const first = new Date(year, month, 1)
    const startWeekday = first.getDay() // 0..6
    // Volta `startWeekday` dias para chegar no domingo dessa semana.
    const start = new Date(year, month, 1 - startWeekday)

    const grid: DayCell[][] = []
    const cursor = new Date(start)

    for (let r = 0; r < 6; r++) {
      const row: DayCell[] = []
      for (let c = 0; c < 7; c++) {
        row.push({
          year: cursor.getFullYear(),
          month: cursor.getMonth(),
          day: cursor.getDate(),
          inMonth: cursor.getMonth() === month,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
      grid.push(row)
    }
    return grid
  }

  // Helper estático: nome do mês em PT-BR.
  public static monthName(month: number): string {
    const names = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ]
    return names[month] ?? ""
  }

  // Cabeçalhos das colunas (segunda, terça, ...).
  // Mantemos domingo na primeira coluna porque é o que combina com
  // Date.getDay() — se quiser semana começando segunda, basta rotacionar.
  public static weekdayHeaders(): readonly string[] {
    return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  }
}
