// Barrel — fachada da camada OOP do calendário.
//
// Cada arquivo se concentra em um pedaço do CED do AP Computer Science A.
// Ver comentários internos para a unidade exata.

export {
  CalendarEvent,
  type EventCategory,
  type SerializedEvent,
} from "./CalendarEvent"

export {
  StudyEvent,
  ExamEvent,
  AssignmentEvent,
  SchoolDayEvent,
  eventFromJSON,
  isStudyEvent,
  isExamEvent,
  isAssignmentEvent,
  isSchoolDayEvent,
} from "./EventTypes"

export { Period } from "./Period"
export { EventList } from "./EventList"
export { CalendarGrid, type DayCell } from "./CalendarGrid"
export { EventScheduler } from "./EventScheduler"
export {
  JOSE_SCHEDULE,
  buildJoseSchedule,
  getJoseScheduleDateKeys,
} from "./jose-schedule"

// Mapeamento didático: arquivo → unidade do CED.
export const AP_CS_CONCEPT_MAP = [
  {
    file: "CalendarEvent.ts",
    concepts: [
      "Unit 2 — Using Objects",
      "Unit 5 — Writing Classes (encapsulation, static, abstract)",
      "Unit 9 — Inheritance (abstract methods, super)",
    ],
  },
  {
    file: "EventTypes.ts",
    concepts: [
      "Unit 9 — Inheritance, super() calls, method overriding (polymorphism)",
      "Unit 5 — Composition: SchoolDayEvent HAS-A array de Period",
      "Factory pattern para reidratação",
    ],
  },
  {
    file: "Period.ts",
    concepts: [
      "Unit 5 — Value class com campos readonly (final em Java)",
      "Unit 1/2 — Aritmética inteira (formatação HH:mm)",
      "Unit 5 — Métodos estáticos (formatTime, fromJSON)",
    ],
  },
  {
    file: "jose-schedule.ts",
    concepts: [
      "Unit 7 — Arrays paralelos (matérias × slots de horário)",
      "Unit 4 — Traverse para construir objetos a partir de dados",
      "Padrão Builder",
    ],
  },
  {
    file: "EventList.ts",
    concepts: [
      "Unit 7 — ArrayList API (add, get, set, remove, size)",
      "Unit 7 — Selection Sort",
      "Unit 4 — Iteration & traversal",
    ],
  },
  {
    file: "CalendarGrid.ts",
    concepts: [
      "Unit 8 — 2D Arrays (matriz semanas × dias)",
      "Unit 4 — Nested loops para varrer / buscar",
    ],
  },
  {
    file: "EventScheduler.ts",
    concepts: [
      "Unit 7 — Insertion Sort",
      "Unit 10 — Recursão (countEventsRecursive, countByCategoryRecursive)",
      "Unit 5 — Utility class (métodos estáticos)",
    ],
  },
] as const
