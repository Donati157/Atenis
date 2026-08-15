// lib/vnext/domains/catalogs/current.ts
//
// Catálogo MÍNIMO dos domínios usados hoje + STUBS ilustrativos dos
// domínios que a arquitetura precisa suportar (AP, language).
//
// NÃO IMPLEMENTAMOS os 8 domínios AP completos aqui. Estes stubs
// existem só pra:
//   1. Ancorar a decisão arquitetural em código verificável.
//   2. Servir de teste que o schema aceita os shapes reais que virão.
//
// Quando cada domínio for realmente construído (dataset, catálogo de
// misconceptions, questões), este catálogo cresce.

import type { AcademicDomain } from "../types"

export const CURRENT_ATENIS_DOMAINS: AcademicDomain[] = [
  {
    id: "matematica",
    name: "Matemática",
    domainType: "school",
    framework: "bncc",
  },
  {
    id: "portugues",
    name: "Português",
    domainType: "school",
    framework: "bncc",
  },
]

// STUBS — documentação executável dos domínios ARQUITETURALMENTE
// suportados. Podem ser registrados no registry pra demonstrar
// extensibilidade sem entregar conteúdo.
export const PLANNED_DOMAIN_STUBS: AcademicDomain[] = [
  {
    id: "ap-microeconomics",
    name: "AP Microeconomics",
    domainType: "ap",
    framework: "ap-ced",
    description:
      "Stub arquitetural. Nenhuma questão real ainda. Framework: College Board CED.",
  },
  {
    id: "ap-statistics",
    name: "AP Statistics",
    domainType: "ap",
    framework: "ap-ced",
    description: "Stub arquitetural.",
  },
  {
    id: "ap-computer-science-principles",
    name: "AP Computer Science Principles",
    domainType: "ap",
    framework: "ap-ced",
    description: "Stub arquitetural.",
  },
  {
    id: "japanese-language",
    name: "Japanese Language & Culture",
    domainType: "language",
    framework: "cefr",
    description:
      "Stub arquitetural. Usa proficiencyLevel (A1-C2 ou N5-N1 JLPT) em vez de grade escolar.",
  },
]
