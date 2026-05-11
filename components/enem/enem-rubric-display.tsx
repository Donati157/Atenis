"use client"

import { enemCompetencies, colorForScore } from "@/lib/enem-rubric"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

export function ENEMRubricDisplay() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground font-display">
          Rubrica oficial do ENEM — redação
        </h3>
        <p className="text-sm text-muted-foreground">
          5 competências × 200 pontos = 1000 pontos totais. Fonte: Cartilha do Participante INEP.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Formato:</strong> texto dissertativo-argumentativo
          em prosa, com proposta de intervenção no final.
        </p>
        <p>
          <strong className="text-foreground">Tamanho:</strong> 7 a 30 linhas (≈ 200–450 palavras).
          Menos que 7 linhas = anulada.
        </p>
        <p>
          <strong className="text-foreground">Zerada se:</strong> fuga total ao tema, desrespeito
          aos direitos humanos (C5), ou texto desconexo/cópia.
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {enemCompetencies.map((comp) => (
          <AccordionItem
            key={comp.id}
            value={comp.id}
            className="border border-border rounded-lg px-4 bg-card/50"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <span className="font-medium text-foreground truncate">{comp.shortName}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {comp.id.toUpperCase()} · 0-200 pts
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-sm text-foreground/90 mb-3">{comp.name}</p>
              <p className="text-xs text-muted-foreground mb-4">Foco: {comp.focus}</p>
              <div className="space-y-3">
                {comp.levels.map((lvl) => (
                  <div key={lvl.points} className="flex flex-col gap-1 text-sm">
                    <span className={`font-medium ${colorForScore(lvl.points)}`}>
                      {lvl.label} · {lvl.points} pts
                    </span>
                    <span className="text-muted-foreground text-xs">{lvl.description}</span>
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
