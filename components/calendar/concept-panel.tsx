"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Code2 } from "lucide-react"
import { AP_CS_CONCEPT_MAP } from "@/lib/calendar"

// Painel didático: explica que conceitos do CED de AP CS A estão sendo
// demonstrados pela engenharia do calendário. Cada arquivo do lib/calendar
// vira um item.
export function ConceptPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Code2 className="h-4 w-4 text-accent" />
          Por trás: AP Computer Science
        </CardTitle>
        <CardDescription>
          Cada peça do código demonstra um conceito do Course and Exam
          Description.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {AP_CS_CONCEPT_MAP.map((entry) => (
          <div
            key={entry.file}
            className="rounded-lg border border-border/60 bg-secondary/30 p-2.5"
          >
            <p className="text-xs font-mono font-semibold mb-1 text-accent">
              {entry.file}
            </p>
            <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
              {entry.concepts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground pt-1 leading-relaxed">
          Abra <code className="font-mono">lib/calendar/</code> para ver
          a implementação. Os comentários no código apontam a unidade
          exata do CED.
        </p>
      </CardContent>
    </Card>
  )
}
