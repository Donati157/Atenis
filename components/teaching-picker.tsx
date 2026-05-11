"use client"

import { Label } from "@/components/ui/label"
import { SUBJECTS, SUBJECTS_BY_GRADE } from "@/lib/subjects"
import { GRADE_LEVELS, type TeachingAssignments } from "@/lib/grades"
import { cn } from "@/lib/utils"

interface TeachingPickerProps {
  assignments: TeachingAssignments
  onChange: (next: TeachingAssignments) => void
  disabled?: boolean
  helperText?: string
}

export function TeachingPicker({
  assignments,
  onChange,
  disabled,
  helperText = "Marque as séries que você leciona; em cada uma, escolha as matérias.",
}: TeachingPickerProps) {
  const isGradeOn = (grade: string) => assignments[grade] !== undefined

  const toggleGrade = (grade: string) => {
    if (isGradeOn(grade)) {
      const next = { ...assignments }
      delete next[grade]
      onChange(next)
    } else {
      onChange({ ...assignments, [grade]: [] })
    }
  }

  const toggleSubject = (grade: string, subject: string) => {
    const current = assignments[grade] ?? []
    const nextSubjects = current.includes(subject)
      ? current.filter((s) => s !== subject)
      : [...current, subject]
    onChange({ ...assignments, [grade]: nextSubjects })
  }

  const activeGrades = GRADE_LEVELS.filter((g) => isGradeOn(g.value))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label>Quais séries você leciona?</Label>
        {helperText && (
          <p className="text-xs text-muted-foreground -mt-1">{helperText}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {GRADE_LEVELS.map((g) => {
            const on = isGradeOn(g.value)
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => toggleGrade(g.value)}
                disabled={disabled}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  on
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-input bg-background hover:bg-secondary/50",
                )}
              >
                {g.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeGrades.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm">Quais matérias em cada série?</Label>
          <div className="space-y-2">
            {activeGrades.map((g) => {
              const subjectsForGrade = SUBJECTS_BY_GRADE[g.value] ?? []
              const selectedSubjects = assignments[g.value] ?? []
              const empty = selectedSubjects.length === 0
              const summary = empty
                ? "selecione pelo menos uma"
                : `${selectedSubjects.length} matéria${selectedSubjects.length === 1 ? "" : "s"}`
              return (
                <div
                  key={g.value}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    empty
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-accent/50 bg-accent/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-medium">{g.label}</span>
                    <span
                      className={cn(
                        "text-xs",
                        empty ? "text-amber-600" : "text-accent",
                      )}
                    >
                      {summary}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUBJECTS.filter((s) =>
                      subjectsForGrade.includes(s.id),
                    ).map((s) => {
                      const selected = selectedSubjects.includes(s.id)
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleSubject(g.value, s.id)}
                          disabled={disabled}
                          aria-pressed={selected}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                            selected
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-input bg-background hover:bg-secondary/50",
                          )}
                        >
                          <span>{s.emoji}</span>
                          <span>{s.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
