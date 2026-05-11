/**
 * Bloco de aula dentro de um dia letivo.
 *
 * Conceitos AP CS A:
 *  - Unit 5 (Writing Classes): "value class" — pequena, todos os campos
 *    `readonly` (equivalente a `final` em Java), construtor que recebe
 *    todos os atributos, getters puros sem efeito colateral.
 *  - Unit 1/2 (Primitive types, math): aritmética de inteiros para
 *    formatar minutos como HH:mm (divisão inteira + módulo).
 *  - Unit 5: método estático `formatTime` (não depende de instância).
 *  - Unit 5: método estático factory `fromJSON` para reidratação.
 *
 * Equivalente Java:
 *   public class Period {
 *     private final int index;
 *     private final String subject;
 *     private final int startMinutes;
 *     private final int endMinutes;
 *     ...
 *   }
 */
export class Period {
  public constructor(
    private readonly index: number, // 1..N (posição no dia)
    private readonly subject: string,
    private readonly startMinutes: number, // minutos desde 00:00
    private readonly endMinutes: number,
  ) {}

  public getIndex(): number {
    return this.index
  }
  public getSubject(): string {
    return this.subject
  }
  public getStartMinutes(): number {
    return this.startMinutes
  }
  public getEndMinutes(): number {
    return this.endMinutes
  }

  public getStartLabel(): string {
    return Period.formatTime(this.startMinutes)
  }
  public getEndLabel(): string {
    return Period.formatTime(this.endMinutes)
  }
  public getDurationMinutes(): number {
    return this.endMinutes - this.startMinutes
  }

  // Diferencia "intervalos institucionais" (advisory, recreio, almoço) das
  // aulas acadêmicas reais. Útil para a UI destacar.
  public isAcademic(): boolean {
    const s = this.subject.trim().toLowerCase()
    return (
      s !== "advisory" &&
      s !== "break" &&
      s !== "almoço" &&
      s !== "almoco" &&
      s !== "intervalo" &&
      s !== "recreio"
    )
  }

  // Unit 5: método estático auxiliar.
  private static formatTime(min: number): string {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  public toJSON(): { index: number; subject: string; startMinutes: number; endMinutes: number } {
    return {
      index: this.index,
      subject: this.subject,
      startMinutes: this.startMinutes,
      endMinutes: this.endMinutes,
    }
  }

  public static fromJSON(raw: unknown): Period {
    const r = raw as Partial<{ index: number; subject: string; startMinutes: number; endMinutes: number }>
    return new Period(
      typeof r.index === "number" ? r.index : 0,
      typeof r.subject === "string" ? r.subject : "",
      typeof r.startMinutes === "number" ? r.startMinutes : 0,
      typeof r.endMinutes === "number" ? r.endMinutes : 0,
    )
  }
}
