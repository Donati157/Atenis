"use client"

import { rubricCriteria, getLevelLabel } from "@/lib/rubric-data"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

export function RubricDisplay() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          Criterios de Avaliacao
        </h3>
        <p className="text-sm text-muted-foreground">
          Global Citizen Diploma - Rubrica Oficial
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Requisitos:</strong> 1200-1500
          palavras
        </p>
        <p>Evidencias sao necessarias para elegibilidade ao Certificado ou Diploma.</p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {rubricCriteria.map((criteria) => (
          <AccordionItem
            key={criteria.id}
            value={criteria.id}
            className="border border-border rounded-lg px-4 bg-card/50"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">
                  {criteria.namePt}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {criteria.weight}%
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3">
                {criteria.levels.map((level) => (
                  <div
                    key={level.level}
                    className="flex flex-col gap-1 text-sm"
                  >
                    <span
                      className={`font-medium ${
                        level.level === "exemplifies"
                          ? "text-green-400"
                          : level.level === "meets"
                            ? "text-blue-400"
                            : level.level === "approaches"
                              ? "text-yellow-400"
                              : "text-red-400"
                      }`}
                    >
                      {getLevelLabel(level.level)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {level.description}
                    </span>
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
