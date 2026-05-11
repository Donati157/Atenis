/**
 * Classe base de qualquer item do calendário.
 *
 * Conceitos de AP Computer Science A demonstrados aqui:
 *  - Unit 2 (Using Objects): construtor, this, instâncias.
 *  - Unit 5 (Writing Classes): classe abstrata, encapsulamento (campos
 *    private + getters/setters), variável static (nextId), método static
 *    (generateId), defensive copy em getDate.
 *  - Unit 9 (Inheritance): métodos abstract sobrescritos pelas subclasses
 *    (getCategory, getColor, getIcon) → polimorfismo.
 *
 * Equivalente Java:
 *   public abstract class CalendarEvent {
 *     private static int nextId = 1;
 *     private final String id;
 *     ...
 *     public abstract String getCategory();
 *   }
 */
export abstract class CalendarEvent {
  // Unit 5: variável static — compartilhada por todas as instâncias.
  private static nextId = 1

  // Unit 5: encapsulamento — só a própria classe lê/escreve direto.
  private readonly id: string
  private title: string
  private date: Date
  private description: string

  protected constructor(
    title: string,
    date: Date,
    description = "",
    id?: string,
  ) {
    this.id = id ?? CalendarEvent.generateId()
    this.title = title
    // Unit 5: defensive copy — proteger contra mutação externa.
    this.date = new Date(date)
    this.description = description
  }

  // Unit 5: método static — não depende de instância.
  private static generateId(): string {
    const n = CalendarEvent.nextId++
    return `evt_${n}_${Date.now()}`
  }

  // ───────────── getters ─────────────
  public getId(): string {
    return this.id
  }
  public getTitle(): string {
    return this.title
  }
  public getDate(): Date {
    // Defensive copy: quem chamou não consegue mutar o estado interno.
    return new Date(this.date)
  }
  public getDescription(): string {
    return this.description
  }

  // ───────────── setters ─────────────
  public setTitle(t: string): void {
    this.title = t
  }
  public setDate(d: Date): void {
    this.date = new Date(d)
  }
  public setDescription(d: string): void {
    this.description = d
  }

  // ───────────── métodos abstract (Unit 9) ─────────────
  // Cada subclasse OBRIGATORIAMENTE implementa. Quando o código chama
  // event.getColor() em uma referência do tipo CalendarEvent, o método
  // executado é o da subclasse real → polimorfismo dinâmico.
  public abstract getCategory(): EventCategory
  public abstract getColor(): string
  public abstract getIcon(): string

  // Unit 9: análogo de toString() do Java. Subclasses podem sobrescrever
  // para mostrar mais detalhes.
  public toString(): string {
    return `[${this.getCategory()}] ${this.title} — ${this.formatDate()}`
  }

  private formatDate(): string {
    return this.date.toLocaleDateString("pt-BR")
  }

  // Unit 5: equals — dois eventos são iguais se compartilham o id.
  public equals(other: CalendarEvent): boolean {
    return this.id === other.id
  }

  // Unit 7: comparação para sorting. Retorna negativo se this < other,
  // zero se iguais, positivo se this > other (mesmo contrato de Comparable).
  public compareDate(other: CalendarEvent): number {
    return this.date.getTime() - other.date.getTime()
  }

  // Verifica se o evento cai num dia específico (ignora hora).
  public isOnDate(year: number, month: number, day: number): boolean {
    return (
      this.date.getFullYear() === year &&
      this.date.getMonth() === month &&
      this.date.getDate() === day
    )
  }

  // Para serialização em localStorage. Cada subclass pode estender.
  public toJSON(): SerializedEvent {
    return {
      id: this.id,
      kind: this.getCategory(),
      title: this.title,
      date: this.date.toISOString(),
      description: this.description,
    }
  }
}

export type EventCategory = "study" | "exam" | "assignment" | "school_day"

export type SerializedEvent = {
  id: string
  kind: EventCategory
  title: string
  date: string
  description: string
  // Subclasses adicionam campos extras via interseção em toJSON.
  [extra: string]: unknown
}
