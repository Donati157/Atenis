"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, GraduationCap, Users, TrendingUp, History, Pencil } from "lucide-react"

const GRADE_LABELS: Record<string, string> = {
  "6th_grade": "6º ano",
  "7th_grade": "7º ano",
  "8th_grade": "8º ano",
  "9th_grade": "9º ano",
  "10th_grade": "10º ano",
  "11th_grade": "11º ano",
  "12th_grade": "12º ano",
}

export interface Student {
  id: string
  full_name: string | null
  grade_level: string | null
  email: string | null
  created_at: string | null
  hidden_from_staff?: boolean | null
}

interface StudentsListProps {
  students: Student[]
}

export function StudentsList({ students }: StudentsListProps) {
  const [query, setQuery] = useState("")
  const [grade, setGrade] = useState<string>("all")

  // Defense-in-depth: even though the RPC filters by role='student' and hidden,
  // ensure no admin/professor/hidden student leaks through on the client side.
  const onlyStudents = useMemo(
    () =>
      students.filter((s) => {
        if ((s as { role?: string }).role && (s as { role?: string }).role !== "student") {
          return false
        }
        if (s.hidden_from_staff === true) return false
        return true
      }),
    [students],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return onlyStudents.filter((s) => {
      if (grade !== "all" && s.grade_level !== grade) return false
      if (!q) return true
      return (
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q)
      )
    })
  }, [onlyStudents, query, grade])

  const byGrade = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of onlyStudents) {
      const key = s.grade_level || "sem_serie"
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [onlyStudents])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{onlyStudents.length}</div>
                <div className="text-xs text-muted-foreground">Estudantes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        {(["10th_grade", "11th_grade", "12th_grade"] as const).map((g) => (
          <Card key={g}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">{byGrade[g] || 0}</div>
                  <div className="text-xs text-muted-foreground">{GRADE_LABELS[g]}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9"
          />
        </div>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as séries</SelectItem>
            {Object.entries(GRADE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Lista de estudantes
            <Badge variant="secondary" className="ml-auto">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {onlyStudents.length === 0
                ? "Nenhum estudante cadastrado ainda."
                : "Nenhum estudante corresponde aos filtros."}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-semibold">
                    {initials(s.full_name, s.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {s.full_name || s.email || "(sem nome)"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                  </div>
                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    {s.grade_level && (
                      <Badge variant="secondary">
                        {GRADE_LABELS[s.grade_level] || s.grade_level}
                      </Badge>
                    )}
                    {s.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button asChild variant="ghost" size="sm" title="Ver progresso">
                      <Link href={`/dashboard/students/${s.id}/progress`}>
                        <TrendingUp className="h-4 w-4" />
                        <span className="hidden lg:inline ml-1">Progresso</span>
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" title="Ver histórico">
                      <Link href={`/dashboard/students/${s.id}/history`}>
                        <History className="h-4 w-4" />
                        <span className="hidden lg:inline ml-1">Histórico</span>
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" title="Editar dados">
                      <Link href={`/dashboard/students/${s.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        <span className="hidden lg:inline ml-1">Editar</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function initials(name: string | null, email: string | null): string {
  const source = (name || email || "?").trim()
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return ""
  }
}
