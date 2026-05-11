"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Compass, Pencil } from "lucide-react"

export interface LeaderRow {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  leadership_title: string | null
  created_at: string | null
}

interface LeadersListProps {
  leaders: LeaderRow[]
}

export function LeadersList({ leaders }: LeadersListProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return leaders
    return leaders.filter(
      (l) =>
        (l.full_name || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.leadership_title || "").toLowerCase().includes(q),
    )
  }, [leaders, query])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{leaders.length}</div>
                <div className="text-xs text-muted-foreground">Lideranças</div>
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
            placeholder="Buscar por nome, e-mail ou cargo..."
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-500" />
            Lista de lideranças
            <Badge variant="secondary" className="ml-auto">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {leaders.length === 0
                ? "Nenhuma liderança cadastrada ainda."
                : "Nenhum resultado pra essa busca."}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center text-sm font-semibold">
                    {initials(l.full_name, l.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {l.full_name || l.email || "(sem nome)"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{l.email}</div>
                    {l.leadership_title && (
                      <div className="mt-1">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-amber-500/40 text-amber-600">
                          {l.leadership_title}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    {l.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(l.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button asChild variant="ghost" size="sm" title="Editar">
                      <Link href={`/dashboard/leaders/${l.id}/edit`}>
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
