"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Briefcase, Pencil, BookOpen } from "lucide-react"

const GRADE_LABELS: Record<string, string> = {
  "6th_grade": "6º",
  "7th_grade": "7º",
  "8th_grade": "8º",
  "9th_grade": "9º",
  "10th_grade": "10º",
  "11th_grade": "11º",
  "12th_grade": "12º",
}

const NATURAL_SUB_LABELS: Record<string, string> = {
  fisica: "Física",
  quimica: "Química",
  biologia: "Biologia",
}

export interface Teacher {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  teaching_grades: string[] | null
  teaching_natural_sub: string[] | null
  created_at: string | null
}

interface TeachersListProps {
  teachers: Teacher[]
}

export function TeachersList({ teachers }: TeachersListProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter(
      (t) =>
        (t.full_name || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q),
    )
  }, [teachers, query])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{teachers.length}</div>
                <div className="text-xs text-muted-foreground">Professores</div>
              </div>
            </div>
          </CardContent>
        </Card>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-accent" />
            Lista de professores
            <Badge variant="secondary" className="ml-auto">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {teachers.length === 0
                ? "Nenhum professor cadastrado ainda."
                : "Nenhum professor corresponde à busca."}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-semibold">
                    {initials(t.full_name, t.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {t.full_name || t.email || "(sem nome)"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{t.email}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(t.teaching_grades ?? []).map((g) => (
                        <Badge key={g} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                          {GRADE_LABELS[g] ?? g}
                        </Badge>
                      ))}
                      {(t.teaching_natural_sub ?? []).map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 h-4 border-accent/40 text-accent"
                        >
                          {NATURAL_SUB_LABELS[s] ?? s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    {t.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(t.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button asChild variant="ghost" size="sm" title="Ver conteúdo postado">
                      <Link href={`/dashboard/teachers/${t.id}/content`}>
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden lg:inline ml-1">Conteúdo</span>
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" title="Editar dados">
                      <Link href={`/dashboard/teachers/${t.id}/edit`}>
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
