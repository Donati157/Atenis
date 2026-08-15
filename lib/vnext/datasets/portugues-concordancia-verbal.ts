// lib/vnext/datasets/portugues-concordancia-verbal.ts
//
// Fase 2A.2: segundo dataset — prova de multicontexto. Português, 9º EF,
// tópico "concordancia-verbal". Escopo mínimo (3 questões) suficiente
// pra o Runtime provar que não está preso a matemática/EM01.

import type { Question } from "../questions/types"
import type { SourceRecord } from "../knowledge/types"

const CURATED_AT = "2026-08-11T00:00:00.000Z"
const CURATOR = "atenis-fixture-curator"

// -----------------------------------------------------------------------
// SOURCES
// -----------------------------------------------------------------------

export const SOURCE_BNCC_EF09LP04: SourceRecord = {
  id: "bncc-ef09lp04",
  type: "official",
  title:
    "BNCC — Habilidade EF09LP04: Analisar em textos os aspectos gramaticais relativos à concordância verbal.",
  authorityTier: "primary-official",
  publisher: "Ministério da Educação (MEC) — Brasil",
  publishedAt: "2018-12-14",
  retrievedAt: CURATED_AT,
  provenance: {
    status: "verified",
    verificationMethod: "manual-curator",
    verifiedAt: CURATED_AT,
    domain: "basenacionalcomum.mec.gov.br",
    externalIdentifier: { kind: "bncc-code", value: "EF09LP04" },
  },
  subjects: ["portugues"],
  grades: ["9"],
  topics: ["concordancia-verbal"],
  curatedAt: CURATED_AT,
  curatedBy: CURATOR,
  curationNotes:
    "Habilidade BNCC oficial de 9º ano EF. Curador confirmou existência do código.",
}

export const CONCORDANCIA_SOURCES: SourceRecord[] = [SOURCE_BNCC_EF09LP04]

// -----------------------------------------------------------------------
// QUESTIONS
// -----------------------------------------------------------------------

const base = {
  subject: "portugues",
  grade: "9" as const,
  schoolStage: "middle" as const,
  topic: "concordancia-verbal",
  version: 1,
  status: "verified" as const,
  sourceId: "bncc-ef09lp04",
  epistemicRole: "curricular-reference" as const,
  sourceRole:
    "BNCC EF09LP04 define a habilidade; NÃO fornece gabarito. Enunciado e resposta são autorais.",
  createdAt: CURATED_AT,
  lastReviewedAt: CURATED_AT,
}

export const Q_CONC_DIAG_01: Question = {
  ...base,
  id: "q-concordancia-diag-01",
  question:
    "Complete: 'A maioria dos alunos ___ (chegar) atrasados hoje.' — verbo no singular ou plural?",
  skill: "EF09LP04",
  difficulty: "easy",
  cognitiveDepth: "understand",
  questionType: "diagnostic",
  usableInPhases: ["diagnose", "practice"],
  prerequisites: [],
  expectedAnswer: {
    kind: "short-answer",
    acceptedAnswers: ["chegou", "chegaram", "chegou ou chegaram"],
    caseSensitive: false,
  },
  commonErrors: [
    {
      code: "collective-singular",
      description:
        "Aluno insistir SÓ em plural, ignorando que coletivo com adjunto plural aceita ambos.",
    },
  ],
}

export const Q_CONC_PRAC_01: Question = {
  ...base,
  id: "q-concordancia-prac-01",
  question:
    "Corrija: 'Havia muitos livros na estante' vs 'Existiam muitos livros na estante'. Qual a diferença?",
  skill: "EF09LP04",
  difficulty: "medium",
  cognitiveDepth: "analyze",
  questionType: "practice",
  usableInPhases: ["practice"],
  prerequisites: [],
  expectedAnswer: {
    kind: "short-answer",
    acceptedAnswers: [
      "haver é impessoal",
      "haver é invariável",
      "existir concorda com sujeito",
      "haver invariável e existir concorda",
    ],
    caseSensitive: false,
  },
  commonErrors: [
    {
      code: "existir-vs-haver",
      description:
        "Trocar 'haviam' em construção existencial (deve ser 'havia').",
    },
  ],
}

export const Q_CONC_VERIFY_01: Question = {
  ...base,
  id: "q-concordancia-verify-01",
  question:
    "Reescreva corrigindo: 'Fazem dois anos que ele viajou e existe muitos motivos para voltar'.",
  skill: "EF09LP04",
  difficulty: "hard",
  cognitiveDepth: "evaluate",
  questionType: "verification",
  usableInPhases: ["verify"],
  prerequisites: [],
  expectedAnswer: {
    kind: "short-answer",
    acceptedAnswers: [
      "faz dois anos que ele viajou e existem muitos motivos para voltar",
      "faz dois anos... existem muitos motivos",
    ],
    caseSensitive: false,
  },
  commonErrors: [
    {
      code: "existir-vs-haver",
      description:
        "Deixar 'fazem' no plural ou usar 'haviam' quando deveria ser 'existem'.",
    },
    {
      code: "distance-agreement",
      description:
        "Concordar verbo pelo adjunto próximo em vez do sujeito real.",
    },
  ],
}

export const CONCORDANCIA_QUESTIONS: Question[] = [
  Q_CONC_DIAG_01,
  Q_CONC_PRAC_01,
  Q_CONC_VERIFY_01,
]

// -----------------------------------------------------------------------
// LOADER
// -----------------------------------------------------------------------

import type { SourceRegistry } from "../knowledge/registry"
import type { QuestionBank } from "../questions/bank"
import type { MisconceptionRegistry } from "../misconceptions/registry"
import { CONCORDANCIA_MISCONCEPTIONS } from "../misconceptions/catalogs/portugues-concordancia"

export async function loadConcordanciaDataset(
  sources: SourceRegistry,
  bank: QuestionBank,
  misconceptions?: MisconceptionRegistry,
): Promise<{ sources: number; questions: number; misconceptions: number }> {
  if (misconceptions) {
    await misconceptions.registerAll(CONCORDANCIA_MISCONCEPTIONS)
  }
  for (const s of CONCORDANCIA_SOURCES) await sources.register(s)
  for (const q of CONCORDANCIA_QUESTIONS) await bank.register(q)
  return {
    sources: CONCORDANCIA_SOURCES.length,
    questions: CONCORDANCIA_QUESTIONS.length,
    misconceptions: CONCORDANCIA_MISCONCEPTIONS.length,
  }
}
