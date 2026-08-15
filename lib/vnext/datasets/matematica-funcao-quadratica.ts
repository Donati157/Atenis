// lib/vnext/datasets/matematica-funcao-quadratica.ts
//
// Fase 2A: primeiro dataset real. Matemática — Função Quadrática (2º ano
// EM, habilidade BNCC EM13MAT302).
//
// PRINCÍPIOS DE HONESTIDADE DO DATASET:
//
//  1. Sources apontam pra REFERÊNCIAS REAIS que qualquer um pode conferir
//     (BNCC no site do MEC; PNLD 2021 no MEC/FNDE). NÃO copia texto que
//     eu não tenho como confirmar literal.
//
//  2. `provenance.status = "verified"` só onde eu, como curador, confirmo
//     que a REFERÊNCIA existe. `verificationMethod = "manual-curator"` +
//     `verifiedAt` presente. Isso ATENDE o invariante do registry.
//
//  3. Evidences EM CADA QUESTION NÃO EXISTEM aqui — Question aponta
//     `sourceId` porque a fonte inspirou a questão. A camada
//     Claim/Evidence completa vive na StructuredResponse quando o
//     tutor cita conteúdo dessa fonte.
//
//  4. Questões são AUTORAIS (`authorNote`). Nunca copiei prova oficial.
//     Se algum enunciado bate por acaso com uma questão real, é
//     coincidência estrutural (função quadrática tem enunciados óbvios),
//     não plágio.

import type { Question } from "../questions/types"
import type { SourceRecord } from "../knowledge/types"

const DATASET_CURATED_AT = "2026-08-11T00:00:00.000Z"
const CURATOR = "atenis-fixture-curator"

// -----------------------------------------------------------------------
// SOURCES
// -----------------------------------------------------------------------

export const SOURCE_BNCC_EM13MAT302: SourceRecord = {
  id: "bncc-em13mat302",
  type: "official",
  title:
    "BNCC — Habilidade EM13MAT302: Resolver e elaborar problemas envolvendo funções quadráticas.",
  authorityTier: "primary-official",
  url: "http://basenacionalcomum.mec.gov.br/",
  publisher: "Ministério da Educação (MEC) — Brasil",
  domain: "basenacionalcomum.mec.gov.br",
  publishedAt: "2018-12-14",
  retrievedAt: DATASET_CURATED_AT,
  provenance: {
    status: "verified",
    verificationMethod: "manual-curator",
    verifiedAt: DATASET_CURATED_AT,
    domain: "basenacionalcomum.mec.gov.br",
    externalIdentifier: { kind: "bncc-code", value: "EM13MAT302" },
  },
  subjects: ["matematica"],
  grades: ["EM01", "EM02"],
  topics: ["funcao-quadratica"],
  curatedAt: DATASET_CURATED_AT,
  curatedBy: CURATOR,
  curationNotes:
    "Habilidade BNCC oficial. Curador confirmou que o código EM13MAT302 existe no documento público do MEC. Não confirma texto literal.",
}

export const SOURCE_LIVRO_DANTE: SourceRecord = {
  id: "pnld-dante-matematica-vol1",
  type: "textbook",
  title:
    "Matemática — Contexto & Aplicações, vol. 1 (Luiz Roberto Dante) — PNLD 2021",
  authorityTier: "textbook",
  publisher: "Editora Ática",
  publishedAt: "2020",
  retrievedAt: DATASET_CURATED_AT,
  // NÃO marcamos como verified: o LIVRO existe (PNLD 2021 é registro
  // público), MAS este curador não tem o livro fisicamente pra confirmar
  // trechos. Deixar unverified é a leitura honesta.
  provenance: {
    status: "unverified",
    verificationMethod: "none",
  },
  subjects: ["matematica"],
  grades: ["EM01"],
  topics: ["funcao-quadratica"],
  curatedAt: DATASET_CURATED_AT,
  curatedBy: CURATOR,
  curationNotes:
    "Livro PNLD 2021 (existência pública). Curador não confirmou textos literais — provenance permanece unverified até revisão física do material.",
}

export const QUADRATICA_SOURCES: SourceRecord[] = [
  SOURCE_BNCC_EM13MAT302,
  SOURCE_LIVRO_DANTE,
]

// -----------------------------------------------------------------------
// QUESTIONS — 6 no total
//   2 diagnostic, 3 practice, 1 verification
// -----------------------------------------------------------------------

const commonBase = {
  subject: "matematica",
  grade: "EM01" as const,
  schoolStage: "high" as const,
  topic: "funcao-quadratica",
  version: 1,
  status: "verified" as const,
  sourceId: "bncc-em13mat302",
  // Fase 2A.1: TODA questão do dataset é AUTORAL. A Source (BNCC) só
  // define a habilidade curricular — NÃO fornece gabarito matemático.
  // Marcar explícito impede confusão semântica em quem consumir.
  epistemicRole: "curricular-reference" as const,
  sourceRole:
    "BNCC EM13MAT302 define a habilidade curricular; NÃO fornece gabarito. Enunciado, gabarito e commonErrors são autorais do curador Atenis.",
  createdAt: DATASET_CURATED_AT,
  lastReviewedAt: DATASET_CURATED_AT,
}

export const QUESTION_QUADRATICA_DIAGNOSTIC_01: Question = {
  ...commonBase,
  id: "q-quadratica-diagnostic-01",
  question:
    "Identifique os coeficientes a, b e c da função f(x) = 3x² - 5x + 2.",
  skill: "EM13MAT302",
  difficulty: "easy",
  cognitiveDepth: "understand",
  questionType: "diagnostic",
  usableInPhases: ["diagnose", "practice"],
  prerequisites: [],
  expectedAnswer: {
    kind: "algebraic",
    canonicalForm: "a=3, b=-5, c=2",
    variables: { a: 3, b: -5, c: 2 },
  },
  commonErrors: [
    {
      code: "sign-confusion-b",
      description:
        "Trocar o sinal do coeficiente b (responder b=5 em vez de b=-5).",
      misconception: "Confundir sinal do termo linear com valor absoluto.",
      diagnosticHint:
        "Peça pra reescrever f(x) = 3x² + (-5)x + 2 e olhar o coeficiente.",
    },
  ],
  authorNote:
    "Questão autoral. Se o aluno erra sinal de b, provável confusão fundamental — direcionar pra teach.",
}

export const QUESTION_QUADRATICA_DIAGNOSTIC_02: Question = {
  ...commonBase,
  id: "q-quadratica-diagnostic-02",
  question:
    "A função g(x) = 4x + 1 é uma função quadrática? Justifique brevemente.",
  skill: "EM13MAT302",
  difficulty: "easy",
  cognitiveDepth: "analyze",
  questionType: "diagnostic",
  usableInPhases: ["diagnose"],
  prerequisites: [],
  expectedAnswer: {
    kind: "short-answer",
    acceptedAnswers: [
      "não",
      "nao",
      "não é quadrática",
      "não é quadratica",
      "nao é",
      "é linear",
      "é afim",
      "linear",
      "afim",
    ],
    caseSensitive: false,
  },
  commonErrors: [
    {
      code: "false-positive-quadratic",
      description:
        "Chamar g(x)=4x+1 de quadrática — confunde com 'tem letra x envolvida'.",
      misconception:
        "Não reconhece que quadrática exige termo x² com coeficiente não nulo.",
    },
  ],
  authorNote:
    "Teste de conceito básico. Filtragem inicial pra decidir se precisa reforçar a definição antes de resolver.",
}

export const QUESTION_QUADRATICA_PRACTICE_01: Question = {
  ...commonBase,
  id: "q-quadratica-practice-01",
  question:
    "Resolva a equação x² - 5x + 6 = 0 usando a fórmula resolutiva (Bhaskara).",
  skill: "EM13MAT302",
  difficulty: "medium",
  cognitiveDepth: "apply",
  questionType: "practice",
  usableInPhases: ["practice"],
  prerequisites: ["EM13MAT302"],
  expectedAnswer: {
    kind: "algebraic",
    canonicalForm: "x=2 ou x=3",
    variables: { x1: 2, x2: 3 },
    equivalentForms: ["{2, 3}", "S = {2, 3}", "x=3 ou x=2"],
  },
  commonErrors: [
    {
      code: "delta-sign",
      description:
        "Errar sinal do discriminante ao calcular Δ = b² - 4ac (ex: computar 25 + 24 em vez de 25 - 24).",
    },
    {
      code: "one-root-only",
      description:
        "Devolver só x=2 esquecendo x=3 (ou vice-versa).",
      diagnosticHint: "Pedir explicitamente 'quantas raízes reais tem?'",
    },
  ],
}

export const QUESTION_QUADRATICA_PRACTICE_02: Question = {
  ...commonBase,
  id: "q-quadratica-practice-02",
  question:
    "A função f(x) = -2x² + 8x - 5 tem concavidade voltada para cima ou para baixo? Justifique.",
  skill: "EM13MAT302",
  difficulty: "medium",
  cognitiveDepth: "analyze",
  questionType: "practice",
  usableInPhases: ["practice"],
  prerequisites: ["EM13MAT302"],
  expectedAnswer: {
    kind: "short-answer",
    acceptedAnswers: [
      "para baixo",
      "pra baixo",
      "voltada para baixo",
      "voltada pra baixo",
      "para baixo porque a < 0",
      "para baixo porque a<0",
    ],
    caseSensitive: false,
  },
  commonErrors: [
    {
      code: "concavity-inversion",
      description:
        "Dizer 'para cima' porque enxerga só o quadrado sem olhar o sinal do coeficiente a.",
      misconception:
        "Ignora que sinal de a controla concavidade.",
    },
  ],
}

export const QUESTION_QUADRATICA_PRACTICE_03: Question = {
  ...commonBase,
  id: "q-quadratica-practice-03",
  question:
    "Determine as coordenadas do vértice da parábola dada por f(x) = x² - 4x + 3.",
  skill: "EM13MAT302",
  difficulty: "medium",
  cognitiveDepth: "apply",
  questionType: "practice",
  usableInPhases: ["practice"],
  prerequisites: ["EM13MAT302"],
  expectedAnswer: {
    kind: "algebraic",
    canonicalForm: "V = (2, -1)",
    variables: { xv: 2, yv: -1 },
    equivalentForms: ["(2, -1)", "x=2, y=-1", "V(2, -1)"],
  },
  commonErrors: [
    {
      code: "xv-sign-error",
      description:
        "Errar sinal na fórmula xv = -b/(2a), responder xv = -2 em vez de 2.",
    },
    {
      code: "yv-recompute-error",
      description:
        "Errar substituição de xv em f pra obter yv (ex: fazer 2² - 4·2 + 3 = 5).",
    },
    {
      code: "sign-confusion-b",
      description:
        "Trocar sinal do b ao aplicar xv = -b/(2a) — usar +b em vez de -b.",
      misconception: "Ignora que o sinal do coeficiente vem com o valor.",
    },
  ],
}

export const QUESTION_QUADRATICA_VERIFICATION_01: Question = {
  ...commonBase,
  id: "q-quadratica-verify-01",
  question:
    "Uma pedra é lançada verticalmente para cima e sua altura h (em metros) após t segundos é dada por h(t) = -5t² + 20t + 1. Qual é a altura máxima atingida?",
  skill: "EM13MAT302",
  difficulty: "hard",
  cognitiveDepth: "evaluate",
  questionType: "verification",
  usableInPhases: ["verify"],
  prerequisites: ["EM13MAT302"],
  expectedAnswer: {
    kind: "numeric",
    value: 21,
    tolerance: 0.01,
    unit: "m",
  },
  commonErrors: [
    {
      code: "wrong-vertex-direction",
      description:
        "Calcular altura no t=0 em vez de no vértice.",
    },
    {
      code: "unit-omission",
      description:
        "Responder '21' sem unidade — não é erro numérico, mas pedagogicamente relevante.",
    },
  ],
  authorNote:
    "Contexto físico (queda livre simplificada). Verifica que aluno consegue interpretar 'altura máxima' como yv e aplicar em problema não puro.",
}

export const QUADRATICA_QUESTIONS: Question[] = [
  QUESTION_QUADRATICA_DIAGNOSTIC_01,
  QUESTION_QUADRATICA_DIAGNOSTIC_02,
  QUESTION_QUADRATICA_PRACTICE_01,
  QUESTION_QUADRATICA_PRACTICE_02,
  QUESTION_QUADRATICA_PRACTICE_03,
  QUESTION_QUADRATICA_VERIFICATION_01,
]

// -----------------------------------------------------------------------
// LOADER — helper pra registrar dataset num par (registry, bank).
// -----------------------------------------------------------------------

import type { SourceRegistry } from "../knowledge/registry"
import type { QuestionBank } from "../questions/bank"
import type { MisconceptionRegistry } from "../misconceptions/registry"
import { QUADRATICA_MISCONCEPTIONS } from "../misconceptions/catalogs/quadratica"

export async function loadQuadraticaDataset(
  registry: SourceRegistry,
  bank: QuestionBank,
  misconceptions?: MisconceptionRegistry,
): Promise<{ sources: number; questions: number; misconceptions: number }> {
  // Fase 2A.2: registra catálogo de misconceptions ANTES das questions
  // pra que a validação de commonErrors.code do bank possa rodar.
  if (misconceptions) {
    await misconceptions.registerAll(QUADRATICA_MISCONCEPTIONS)
  }
  for (const s of QUADRATICA_SOURCES) {
    await registry.register(s)
  }
  for (const q of QUADRATICA_QUESTIONS) {
    await bank.register(q)
  }
  return {
    sources: QUADRATICA_SOURCES.length,
    questions: QUADRATICA_QUESTIONS.length,
    misconceptions: QUADRATICA_MISCONCEPTIONS.length,
  }
}
