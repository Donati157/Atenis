"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  AP_COURSES,
  AP_COURSE_CATEGORIES,
  getCoursesByCategory,
  type APCourse,
} from "@/lib/ap-courses"
import { APPracticeExam } from "@/components/ap/ap-practice-exam"
import { Clock, Target, Lock, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

// Mapeia qual curso AP tem simulado interativo disponível.
// Hoje só temos o 2020 Practice Exam 2 do AP World History: Modern.
const AVAILABLE_EXAMS: Record<string, { label: string; note: string }> = {
  "ap-world-history": {
    label: "2020 Practice Exam 2",
    note: "55 questões MCQ · 55 min · nota AP 1-5 estimada",
  },
}

export function APPracticePicker() {
  const [categoryId, setCategoryId] = useState<string>("history_social")
  const [selected, setSelected] = useState<APCourse | null>(null)

  const canSimulate = selected && AVAILABLE_EXAMS[selected.id]

  if (selected && canSimulate) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          <ArrowLeft className="h-4 w-4" />
          Escolher outro AP
        </Button>
        <APPracticeExam />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-semibold">Escolha o AP pra simular</h3>
      </div>

      <Tabs value={categoryId} onValueChange={setCategoryId}>
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto">
          {AP_COURSE_CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="flex flex-col py-2 gap-0.5 text-xs"
            >
              <span className="text-base leading-none">{cat.emoji}</span>
              <span className="text-[11px] leading-tight">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {AP_COURSE_CATEGORIES.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-4">
            <p className="text-xs text-muted-foreground mb-3 px-1">{cat.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {getCoursesByCategory(cat.id).map((c) => {
                const available = !!AVAILABLE_EXAMS[c.id]
                const exam = AVAILABLE_EXAMS[c.id]
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(c)}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left transition-all",
                      available
                        ? "border-accent/60 bg-accent/5 hover:border-accent hover:bg-accent/10 cursor-pointer"
                        : "border-border/40 bg-card/20 hover:border-border/60 opacity-70",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {c.shortTitle}
                          </span>
                          {!available && (
                            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        {available && exam && (
                          <div className="text-[11px] text-accent mt-0.5">{exam.note}</div>
                        )}
                        {!available && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Simulado ainda não disponível — use a aba <em>Corrigir</em>
                          </div>
                        )}
                      </div>
                      {available ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0">
                          Disponível
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] shrink-0">
                          Em breve
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {selected && !canSimulate && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-foreground">
                Simulado interativo para <strong>{selected.title}</strong> ainda não foi
                implementado.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Por enquanto, use a aba <strong>Corrigir</strong> — você pode colar qualquer
                resposta AP desse curso e receber correção pela rubrica genérica adaptada.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg bg-muted/30 border border-border/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Simulado interativo (com timer, navegação, correção automática e estimativa AP 1-5)
          está ativo apenas pro <strong>AP World History: Modern</strong> usando o Practice Exam
          2020 oficial do College Board. Outros cursos serão adicionados conforme as provas
          oficiais forem extraídas.
        </span>
      </div>
    </div>
  )
}
