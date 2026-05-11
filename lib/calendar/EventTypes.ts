/**
 * Subclasses concretas de CalendarEvent.
 *
 * Conceitos de AP CS A:
 *  - Unit 9 (Inheritance): cada classe usa `extends` + `super(...)` no
 *    construtor, e sobrescreve os métodos abstract (getCategory, getColor,
 *    getIcon) → polimorfismo.
 *  - Unit 9: o método toJSON é sobrescrito (override) para incluir os
 *    campos próprios da subclass — chamando super.toJSON() primeiro
 *    (reuso de implementação herdada).
 *  - Padrão Factory (Unit 5/9): eventFromJSON decide qual subclasse
 *    instanciar a partir do campo `kind`, ilustrando como
 *    um polimorfismo de runtime é construído.
 */

import {
  CalendarEvent,
  type EventCategory,
  type SerializedEvent,
} from "./CalendarEvent"
import { Period } from "./Period"

// ──────────────────────────────────────────────────────────
// Sessão de estudo
// ──────────────────────────────────────────────────────────
export class StudyEvent extends CalendarEvent {
  private subject: string
  private durationMinutes: number

  public constructor(
    title: string,
    date: Date,
    subject: string,
    durationMinutes: number,
    description = "",
    id?: string,
  ) {
    // Unit 9: super(...) chama o construtor da superclasse.
    super(title, date, description, id)
    this.subject = subject
    this.durationMinutes = durationMinutes
  }

  public getSubject(): string {
    return this.subject
  }
  public getDurationMinutes(): number {
    return this.durationMinutes
  }

  // Override (Unit 9): polimorfismo.
  public override getCategory(): EventCategory {
    return "study"
  }
  public override getColor(): string {
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300"
  }
  public override getIcon(): string {
    return "📖"
  }

  public override toJSON(): SerializedEvent {
    // Unit 9: chama o toJSON herdado e adiciona campos próprios.
    return {
      ...super.toJSON(),
      subject: this.subject,
      durationMinutes: this.durationMinutes,
    }
  }
}

// ──────────────────────────────────────────────────────────
// Prova / exame
// ──────────────────────────────────────────────────────────
export class ExamEvent extends CalendarEvent {
  // Que prova (ENEM, Fuvest, AP, simulado, etc.)
  private exam: string

  public constructor(
    title: string,
    date: Date,
    exam: string,
    description = "",
    id?: string,
  ) {
    super(title, date, description, id)
    this.exam = exam
  }

  public getExam(): string {
    return this.exam
  }

  public override getCategory(): EventCategory {
    return "exam"
  }
  public override getColor(): string {
    return "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300"
  }
  public override getIcon(): string {
    return "📝"
  }

  public override toJSON(): SerializedEvent {
    return { ...super.toJSON(), exam: this.exam }
  }
}

// ──────────────────────────────────────────────────────────
// Tarefa / lição de casa
// ──────────────────────────────────────────────────────────
export class AssignmentEvent extends CalendarEvent {
  private subject: string

  public constructor(
    title: string,
    date: Date,
    subject: string,
    description = "",
    id?: string,
  ) {
    super(title, date, description, id)
    this.subject = subject
  }

  public getSubject(): string {
    return this.subject
  }

  public override getCategory(): EventCategory {
    return "assignment"
  }
  public override getColor(): string {
    return "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300"
  }
  public override getIcon(): string {
    return "📌"
  }

  public override toJSON(): SerializedEvent {
    return { ...super.toJSON(), subject: this.subject }
  }
}

// ──────────────────────────────────────────────────────────
// Dia letivo completo (composição: contém vários Period)
// ──────────────────────────────────────────────────────────
// Conceitos AP CS A:
//  - Unit 5 (composition): SchoolDayEvent HAS-A array de Period.
//    Diferente de herança (IS-A), composição é "tem um".
//  - Unit 7 (ArrayList-like): mantemos os Period em um array,
//    com defensive copy na entrada e na saída.
//  - Unit 9 (override): overridemos getCategory/getColor/getIcon
//    e estendemos toJSON para serializar os Period internos.
//  - Unit 4 (traverse): getAcademicSubjects faz um filtro com
//    enhanced-for, ignorando intervalos institucionais.
//  - Open/Closed Principle: adicionar este tipo NÃO exigiu mexer
//    em CalendarEvent, EventList nem CalendarGrid — só estender.
export class SchoolDayEvent extends CalendarEvent {
  private readonly dayCycle: number // 1..6 (rotação Concept SP)
  private readonly periods: Period[]

  public constructor(
    title: string,
    date: Date,
    dayCycle: number,
    periods: Period[],
    description = "",
    id?: string,
  ) {
    super(title, date, description, id)
    this.dayCycle = dayCycle
    // Defensive copy: protege o estado interno.
    this.periods = [...periods]
  }

  public getDayCycle(): number {
    return this.dayCycle
  }
  public getPeriods(): Period[] {
    return [...this.periods]
  }

  // Unit 4: traverse + filtro condicional.
  public getAcademicSubjects(): string[] {
    const out: string[] = []
    for (const p of this.periods) {
      if (p.isAcademic()) out.push(p.getSubject())
    }
    return out
  }

  // Unit 4: contagem de aulas reais (sem advisory/break/almoço).
  public countAcademicPeriods(): number {
    let count = 0
    for (const p of this.periods) {
      if (p.isAcademic()) count++
    }
    return count
  }

  public override getCategory(): EventCategory {
    return "school_day"
  }
  public override getColor(): string {
    return "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300"
  }
  public override getIcon(): string {
    return "🏫"
  }

  public override toJSON(): SerializedEvent {
    return {
      ...super.toJSON(),
      dayCycle: this.dayCycle,
      periods: this.periods.map((p) => p.toJSON()),
    }
  }
}

// ──────────────────────────────────────────────────────────
// Factory de reidratação (Unit 5 / 9)
// ──────────────────────────────────────────────────────────
// Recebe o JSON serializado e devolve a SUBCLASSE correta.
// Esse "switch sobre o tipo" é a "fronteira" — assim que a instância
// existe, todo o código a frente trabalha pelo tipo abstrato e o
// polimorfismo dinâmico cuida do resto.
export function eventFromJSON(raw: SerializedEvent): CalendarEvent {
  const date = new Date(raw.date)
  switch (raw.kind) {
    case "study":
      return new StudyEvent(
        raw.title,
        date,
        typeof raw.subject === "string" ? raw.subject : "",
        typeof raw.durationMinutes === "number" ? raw.durationMinutes : 30,
        raw.description,
        raw.id,
      )
    case "exam":
      return new ExamEvent(
        raw.title,
        date,
        typeof raw.exam === "string" ? raw.exam : "ENEM",
        raw.description,
        raw.id,
      )
    case "assignment":
      return new AssignmentEvent(
        raw.title,
        date,
        typeof raw.subject === "string" ? raw.subject : "",
        raw.description,
        raw.id,
      )
    case "school_day": {
      const periodArr = Array.isArray(raw.periods)
        ? (raw.periods as unknown[])
        : []
      return new SchoolDayEvent(
        raw.title,
        date,
        typeof raw.dayCycle === "number" ? raw.dayCycle : 1,
        periodArr.map((p) => Period.fromJSON(p)),
        raw.description,
        raw.id,
      )
    }
    default: {
      // Exhaustiveness check: TS reclama em compile time se um novo kind
      // for adicionado sem ser tratado aqui.
      const _exhaustive: never = raw.kind
      throw new Error(`eventFromJSON: kind desconhecido ${String(_exhaustive)}`)
    }
  }
}

// Type guard helpers — úteis na UI quando precisamos do dado específico.
export function isStudyEvent(e: CalendarEvent): e is StudyEvent {
  return e.getCategory() === "study"
}
export function isExamEvent(e: CalendarEvent): e is ExamEvent {
  return e.getCategory() === "exam"
}
export function isAssignmentEvent(e: CalendarEvent): e is AssignmentEvent {
  return e.getCategory() === "assignment"
}
export function isSchoolDayEvent(e: CalendarEvent): e is SchoolDayEvent {
  return e.getCategory() === "school_day"
}
