// lib/vnext/misconceptions/catalogs/portugues-concordancia.ts
//
// Catálogo do domínio "concordância verbal" — usado no segundo dataset
// (portugues/9º EF) pra provar que o Runtime não está preso a
// matemática.

import type { MisconceptionEntry } from "../types"

export const CONCORDANCIA_MISCONCEPTIONS: MisconceptionEntry[] = [
  {
    id: "distance-agreement",
    description:
      "Concordar verbo com o núcleo mais próximo (adjunto) em vez do sujeito.",
    subjects: ["portugues"],
    topics: ["concordancia-verbal"],
    grades: ["9"],
    severity: "major",
  },
  {
    id: "collective-singular",
    description:
      "Coletivo (turma, multidão) usar sempre no plural, ignorando regra geral do verbo no singular.",
    subjects: ["portugues"],
    topics: ["concordancia-verbal"],
    grades: ["9"],
    severity: "major",
  },
  {
    id: "existir-vs-haver",
    description:
      "Confundir 'existir' (concorda com sujeito) com 'haver' (impessoal, invariável).",
    subjects: ["portugues"],
    topics: ["concordancia-verbal"],
    grades: ["9"],
    severity: "major",
  },
]
