"use client"

import { useState } from "react"
import {
  apRubrics,
  getRubricById,
  getRubricsByCategory,
  shortRubricLabel,
  AP_CATEGORIES,
} from "@/lib/ap-rubric"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function APRubricDisplay() {
  const [rubricId, setRubricId] = useState<string>(apRubrics[0].id)
  const rubric = getRubricById(rubricId)

  if (!rubric) return null

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground font-display">
          Rubricas do AP College Board
        </h3>
        <p className="text-sm text-muted-foreground">
          Selecione abaixo uma das rubricas oficiais para ver os critérios e descritores de pontuação.
        </p>
      </div>

      <Select value={rubricId} onValueChange={setRubricId}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AP_CATEGORIES.map((cat) => {
            const group = getRubricsByCategory()[cat.id]
            if (!group.length) return null
            return (
              <SelectGroup key={cat.id}>
                <SelectLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.label}
                </SelectLabel>
                {group.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {shortRubricLabel(r.namePt, r.category)} ({r.totalPoints} pts)
                  </SelectItem>
                ))}
              </SelectGroup>
            )
          })}
        </SelectContent>
      </Select>

      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">{rubric.subject}</strong>
        </p>
        <p>Pontuação total: {rubric.totalPoints} pontos</p>
        {rubric.wordRange && (
          <p>
            Tamanho sugerido: {rubric.wordRange.min}–{rubric.wordRange.max} palavras
          </p>
        )}
        {rubric.notesPt && <p>{rubric.notesPt}</p>}
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {rubric.criteria.map((criterion) => (
          <AccordionItem
            key={criterion.id}
            value={criterion.id}
            className="border border-border rounded-lg px-4 bg-card/50"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <span className="font-medium text-foreground truncate">{criterion.namePt}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {criterion.maxPoints} pt{criterion.maxPoints > 1 ? "s" : ""}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3">
                {criterion.descriptors.map((d) => (
                  <div key={d.points} className="flex flex-col gap-1 text-sm">
                    <span
                      className={`font-medium ${
                        d.points === criterion.maxPoints
                          ? "text-green-400"
                          : d.points === 0
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {d.points} pt{d.points === 1 ? "" : "s"}
                    </span>
                    <span className="text-muted-foreground text-xs">{d.descriptionPt}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
