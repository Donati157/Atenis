export const GRADE_LEVELS = [
  { value: "6th_grade", label: "6º ano" },
  { value: "7th_grade", label: "7º ano" },
  { value: "8th_grade", label: "8º ano" },
  { value: "9th_grade", label: "9º ano" },
  { value: "10th_grade", label: "10º ano" },
  { value: "11th_grade", label: "11º ano" },
  { value: "12th_grade", label: "12º ano" },
] as const

export type GradeValue = (typeof GRADE_LEVELS)[number]["value"]

export type TeachingAssignments = Record<string, string[]>

export const SELECT_CLASS =
  "h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function countAssignments(assignments: TeachingAssignments): number {
  return Object.values(assignments).reduce((acc, arr) => acc + arr.length, 0)
}

export function cleanAssignments(
  assignments: TeachingAssignments,
): TeachingAssignments {
  const out: TeachingAssignments = {}
  for (const [grade, subjects] of Object.entries(assignments)) {
    if (subjects.length > 0) out[grade] = subjects
  }
  return out
}
