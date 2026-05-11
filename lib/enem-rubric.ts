// Rubrica oficial da redação do ENEM (5 competências × 200 pts = 1000 pts).
// Fonte: Cartilha do Participante ENEM (INEP).

export interface ENEMLevel {
  points: 0 | 40 | 80 | 120 | 160 | 200
  label: string
  description: string
}

export interface ENEMCompetency {
  id: "c1" | "c2" | "c3" | "c4" | "c5"
  name: string
  shortName: string
  focus: string
  levels: ENEMLevel[]
}

const SIX_LEVEL_LABELS: Record<ENEMLevel["points"], string> = {
  0: "Nível 0",
  40: "Nível 1",
  80: "Nível 2",
  120: "Nível 3",
  160: "Nível 4",
  200: "Nível 5",
}

export const enemCompetencies: ENEMCompetency[] = [
  {
    id: "c1",
    name: "Competência 1 — Domínio da norma padrão",
    shortName: "Norma padrão",
    focus: "Gramática, ortografia, pontuação e concordância.",
    levels: [
      {
        points: 0,
        label: SIX_LEVEL_LABELS[0],
        description: "Texto incompreensível ou fora do padrão escrito.",
      },
      {
        points: 40,
        label: SIX_LEVEL_LABELS[40],
        description: "Erros graves e constantes.",
      },
      {
        points: 80,
        label: SIX_LEVEL_LABELS[80],
        description: "Muitos erros que prejudicam a leitura.",
      },
      {
        points: 120,
        label: SIX_LEVEL_LABELS[120],
        description: "Alguns erros frequentes.",
      },
      {
        points: 160,
        label: SIX_LEVEL_LABELS[160],
        description: "Poucos erros, não comprometem o texto.",
      },
      {
        points: 200,
        label: SIX_LEVEL_LABELS[200],
        description: "Domínio excelente, praticamente sem erros.",
      },
    ],
  },
  {
    id: "c2",
    name: "Competência 2 — Compreensão do tema e repertório",
    shortName: "Tema + repertório",
    focus: "Entendimento do tema + uso de repertório sociocultural.",
    levels: [
      {
        points: 0,
        label: SIX_LEVEL_LABELS[0],
        description: "Fuga total do tema.",
      },
      {
        points: 40,
        label: SIX_LEVEL_LABELS[40],
        description: "Fuga parcial do tema.",
      },
      {
        points: 80,
        label: SIX_LEVEL_LABELS[80],
        description: "Abordagem superficial ou incompleta.",
      },
      {
        points: 120,
        label: SIX_LEVEL_LABELS[120],
        description: "Abordagem parcial do tema + repertório limitado.",
      },
      {
        points: 160,
        label: SIX_LEVEL_LABELS[160],
        description: "Tema bem desenvolvido + repertório adequado.",
      },
      {
        points: 200,
        label: SIX_LEVEL_LABELS[200],
        description: "Aborda totalmente o tema + repertório relevante e bem usado.",
      },
    ],
  },
  {
    id: "c3",
    name: "Competência 3 — Seleção e organização das ideias",
    shortName: "Organização",
    focus: "Estrutura do texto e coerência (introdução, desenvolvimento, conclusão).",
    levels: [
      {
        points: 0,
        label: SIX_LEVEL_LABELS[0],
        description: "Ausência de estrutura lógica.",
      },
      {
        points: 40,
        label: SIX_LEVEL_LABELS[40],
        description: "Ideias desorganizadas.",
      },
      {
        points: 80,
        label: SIX_LEVEL_LABELS[80],
        description: "Estrutura confusa.",
      },
      {
        points: 120,
        label: SIX_LEVEL_LABELS[120],
        description: "Organização mediana.",
      },
      {
        points: 160,
        label: SIX_LEVEL_LABELS[160],
        description: "Boa organização, com pequenas falhas.",
      },
      {
        points: 200,
        label: SIX_LEVEL_LABELS[200],
        description:
          "Excelente organização (introdução, desenvolvimento e conclusão bem definidos).",
      },
    ],
  },
  {
    id: "c4",
    name: "Competência 4 — Coesão textual",
    shortName: "Coesão",
    focus: "Uso de conectivos e ligação entre ideias.",
    levels: [
      {
        points: 0,
        label: SIX_LEVEL_LABELS[0],
        description: "Texto desconexo.",
      },
      {
        points: 40,
        label: SIX_LEVEL_LABELS[40],
        description: "Pouca conexão entre ideias.",
      },
      {
        points: 80,
        label: SIX_LEVEL_LABELS[80],
        description: "Repetição ou uso inadequado de conectivos.",
      },
      {
        points: 120,
        label: SIX_LEVEL_LABELS[120],
        description: "Uso limitado de conectivos.",
      },
      {
        points: 160,
        label: SIX_LEVEL_LABELS[160],
        description: "Bom uso, com pouca repetição.",
      },
      {
        points: 200,
        label: SIX_LEVEL_LABELS[200],
        description: "Uso variado e adequado de conectivos.",
      },
    ],
  },
  {
    id: "c5",
    name: "Competência 5 — Proposta de intervenção",
    shortName: "Proposta de intervenção",
    focus:
      "Solução para o problema. Deve conter: Agente, Ação, Meio, Finalidade, Respeito aos direitos humanos.",
    levels: [
      {
        points: 0,
        label: SIX_LEVEL_LABELS[0],
        description: "Ausência de proposta ou desrespeito aos direitos humanos.",
      },
      {
        points: 40,
        label: SIX_LEVEL_LABELS[40],
        description: "Proposta muito limitada.",
      },
      {
        points: 80,
        label: SIX_LEVEL_LABELS[80],
        description: "Proposta vaga.",
      },
      {
        points: 120,
        label: SIX_LEVEL_LABELS[120],
        description: "Proposta presente, mas incompleta.",
      },
      {
        points: 160,
        label: SIX_LEVEL_LABELS[160],
        description: "Proposta adequada, com leve falta de detalhamento.",
      },
      {
        points: 200,
        label: SIX_LEVEL_LABELS[200],
        description:
          "Proposta completa, detalhada e viável (Agente + Ação + Meio + Finalidade + respeito aos direitos humanos).",
      },
    ],
  },
]

export function totalEnemScore(pointsPerCompetency: number[]): number {
  return pointsPerCompetency.reduce((acc, p) => acc + p, 0)
}

export function scoreBand(total: number): {
  label: string
  color: string
  pct: number
} {
  const pct = Math.round((total / 1000) * 100)
  if (total >= 900) return { label: "Excelente", color: "text-green-400", pct }
  if (total >= 700) return { label: "Muito bom", color: "text-blue-400", pct }
  if (total >= 500) return { label: "Regular", color: "text-yellow-400", pct }
  if (total >= 300) return { label: "Insuficiente", color: "text-orange-400", pct }
  return { label: "Baixo", color: "text-red-400", pct }
}

export function bgForScore(points: number): string {
  if (points >= 160) return "bg-green-500/20 border-green-500/30"
  if (points >= 120) return "bg-blue-500/20 border-blue-500/30"
  if (points >= 80) return "bg-yellow-500/20 border-yellow-500/30"
  if (points >= 40) return "bg-orange-500/20 border-orange-500/30"
  return "bg-red-500/20 border-red-500/30"
}

export function colorForScore(points: number): string {
  if (points >= 160) return "text-green-400"
  if (points >= 120) return "text-blue-400"
  if (points >= 80) return "text-yellow-400"
  if (points >= 40) return "text-orange-400"
  return "text-red-400"
}
