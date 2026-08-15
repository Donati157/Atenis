// lib/vnext/misconceptions/catalogs/quadratica.ts
//
// Catálogo curado de misconceptions do domínio "função quadrática".
// Cada entry aqui é uma DECLARAÇÃO explícita de que esse erro é
// conhecido, catalogado e válido pra referenciamento em Question e
// EvaluationError.

import type { MisconceptionEntry } from "../types"

export const QUADRATICA_MISCONCEPTIONS: MisconceptionEntry[] = [
  {
    id: "sign-confusion-b",
    description:
      "Trocar o sinal do coeficiente b ao identificar coeficientes ou aplicar Bhaskara/xv.",
    subjects: ["matematica"],
    topics: ["funcao-quadratica"],
    grades: ["EM01", "EM02"],
    severity: "major",
  },
  {
    id: "false-positive-quadratic",
    description:
      "Chamar função afim/linear de quadrática por presença da variável x.",
    subjects: ["matematica"],
    topics: ["funcao-quadratica"],
    grades: ["EM01"],
    severity: "critical",
  },
  {
    id: "delta-sign",
    description:
      "Errar sinal do discriminante ao calcular Δ = b² - 4ac.",
    subjects: ["matematica"],
    topics: ["funcao-quadratica"],
    grades: ["EM01"],
    severity: "major",
  },
  {
    id: "one-root-only",
    description:
      "Devolver apenas uma das raízes reais quando existem duas distintas.",
    subjects: ["matematica"],
    topics: ["funcao-quadratica"],
    grades: ["EM01"],
    severity: "major",
  },
  {
    id: "concavity-inversion",
    description:
      "Inverter a concavidade da parábola ignorando o sinal do coeficiente a.",
    subjects: ["matematica"],
    topics: ["funcao-quadratica"],
    grades: ["EM01"],
    severity: "major",
  },
  {
    id: "xv-sign-error",
    description:
      "Errar sinal na fórmula xv = -b/(2a).",
    subjects: ["matematica"],
    topics: ["funcao-quadratica"],
    grades: ["EM01"],
    severity: "major",
  },
  {
    id: "yv-recompute-error",
    description:
      "Errar substituição de xv em f pra obter yv.",
    subjects: ["matematica"],
    topics: ["funcao-quadratica"],
    grades: ["EM01"],
    severity: "minor",
  },
  {
    id: "wrong-vertex-direction",
    description:
      "Calcular altura ou valor extremo no ponto errado (ex: t=0 em vez do vértice).",
    subjects: ["matematica"],
    topics: ["funcao-quadratica"],
    grades: ["EM01"],
    severity: "major",
  },
  {
    id: "unit-omission",
    description:
      "Responder valor numérico sem unidade quando o problema pede grandeza física.",
    subjects: ["matematica"],
    topics: ["funcao-quadratica"],
    grades: ["EM01"],
    severity: "minor",
  },
]
