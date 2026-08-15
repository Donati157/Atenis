# Knowledge ≠ Question Bank — decisão arquitetural

**Status:** rascunho / decisão registrada na Fase 0.1. Não implementado.

**Contexto:** ao começar a projetar a camada de conteúdo do vNext,
apareceu a tentação de tratar "artigos/livros/fontes" e "perguntas/
exercícios/simulados" como o mesmo tipo de dado — afinal, ambos são
"conteúdo educacional". Este documento registra por que essa fusão é
errada e como as duas camadas se separam.

## Regra

**Knowledge** e **Question Bank** são **duas camadas distintas**, com
schema, ciclo de vida, permissões e consumidores diferentes.

## Knowledge

Corpus de material de referência sobre CONTEÚDO — o que o aluno precisa
entender.

Entidades esperadas (futuro):

- **Source** — artigo, paper, livro, documento oficial, capítulo. Tem
  `provenance` real (ver `lib/vnext/schema/epistemic.ts`). Nunca vem só
  do LLM.
- **Chunk** — trecho recuperável de uma Source, indexado pra retrieval
  (embeddings + full-text). Chunk carrega metadata da Source pai.
- **Concept** — nó do grafo de conhecimento (ex: "função quadrática",
  "revolução industrial"). Concepts referenciam Chunks que os explicam
  e ligam-se a habilidades BNCC/CED/GCD.
- **Habilidade curricular** — código BNCC (`EM13MAT302`), habilidade do
  College Board CED, critério do GCD. Ancora Concepts ao currículo.

Consumidores: gerador de resposta (retrieval antes de compor), Analysis
do Critic (verificar se Evidence está mesmo naquela Source), UI de
"fontes citadas".

## Question Bank

Corpus de PERGUNTAS — o que o aluno vai responder pra praticar,
diagnosticar, revisar, provar.

Entidades esperadas (futuro):

- **Question** — a pergunta em si, com o schema abaixo.
- **Attempt** — cada vez que um aluno tentou a Question, com resposta,
  tempo, acerto/erro, contexto (série, modo de estudo).
- **QuestionSet** — agrupamento (simulado ENEM 2023, lista de exercícios
  da unidade 3, prova diagnóstica de álgebra).
- **RubricLink** — Question de ensaio aponta pra rubrica em `lib/*-rubric.ts`.

Consumidores: Method Engine (diagnóstico → seleção de próximas
questões), spaced repetition (revisão), Study Plan (roteiro), corretores
(ENEM/AP/GCD já usam esse tipo hoje, sem estrutura formal).

## Question — shape proposto (não implementar ainda)

```ts
interface Question {
  id: string
  question: string                    // enunciado (pode incluir Markdown/LaTeX)
  subject: SubjectId                  // matéria (matematica, portugues, ...)
  grade: GradeLevel                   // 6-12
  topic: string                       // ex: "função quadrática — coeficientes"
  bnccSkill?: string                  // ex: "EM13MAT302" (opcional; fora do BR pode não ter)
  cedTopic?: string                   // AP CED reference (opcional)
  difficulty: "easy" | "medium" | "hard"
  cognitiveDepth:                      // Bloom-like, ordenado
    | "remember"
    | "understand"
    | "apply"
    | "analyze"
    | "evaluate"
    | "create"
  prerequisites: string[]              // ids de Concepts (Knowledge) necessários
  questionType:
    | "mcq"                            // múltipla escolha
    | "true-false"
    | "short-answer"
    | "long-answer"
    | "essay"                          // redação (usa rubric)
    | "math-symbolic"                  // avaliável por validator matemático
    | "code"                           // AP CS: código a completar
  source: {                            // proveniência da Question
    kind: "official-exam" | "adapted" | "generated" | "curator" | "user-submitted"
    externalRef?: string               // ex: "ENEM 2019 Q127", "Fuvest 2023 Q45"
    year?: number
  }
  answer:                               // uma das formas
    | { kind: "mcq"; correctOptionId: string; options: Array<{id, text, explanation?}> }
    | { kind: "boolean"; correct: boolean; explanation: string }
    | { kind: "short-answer"; acceptedAnswers: string[]; caseSensitive?: boolean }
    | { kind: "rubric"; rubricId: string }         // aponta pra lib/*-rubric.ts
    | { kind: "symbolic"; expectedExpression: string }
    | { kind: "code"; testCases: Array<{input, expected}> }
  commonErrors: Array<{
    description: string                // "confundir raiz com vértice"
    misconception?: string             // ligação com Concept malformado
    diagnosticHint?: string            // como Method Engine detecta
  }>
  targetSkill: {                        // o que essa Question mede
    conceptIds: string[]               // Concepts (Knowledge) exigidos
    skillType: "recall" | "procedural" | "conceptual" | "transfer"
  }
  meta: {
    authorId?: string                   // curador humano quando aplicável
    createdAt: string
    lastReviewedAt?: string
    reviewStatus: "unverified" | "reviewed" | "flagged"
  }
}
```

## Por que separado

1. **Ciclo de vida diferente.** Uma Source é adicionada uma vez e (quase)
   nunca muda. Uma Question é ajustada com feedback do que os alunos
   erram, versionada, aposentada.

2. **Proveniência diferente.** Source cita autoria externa
   (livro/paper/gov). Question pode ser gerada pelo LLM, adaptada de
   prova oficial, ou escrita por curador. `Question.source.kind`
   registra isso com granularidade que `Source.provenance` não precisa.

3. **Recuperação diferente.** Retrieval de Source usa embeddings
   semânticos sobre CONTEÚDO. Seleção de Question usa Method Engine
   (diagnóstico → dificuldade adequada, cobertura de skill, spaced
   repetition). Fundamentalmente objetivos distintos.

4. **Permissões diferentes.** Aluno lê Sources livremente. Sobre
   Questions há isolamento pra evitar vazamento de prova antes de
   aplicar (Attempts com RLS por user_id, professor pode ver só do que
   ele leciona, etc.).

5. **Métricas diferentes.** Source é avaliada por autoridade / recência
   / cobertura. Question é avaliada por dificuldade estimada, taxa de
   acerto, discriminação (quanto separa quem sabe de quem não sabe),
   tempo médio, ambiguidade reportada.

## Interação entre as camadas

- **Question referencia Concept** (via `targetSkill.conceptIds` e
  `prerequisites`). Concept vive na Knowledge — Question aponta pra ele,
  não duplica.
- **Attempt gera Learning Event** que atualiza o `strategyPerformance`
  no Learning State (fase futura). Não classifica aluno em "estilo
  visual/auditivo" — só rastreia "em contexto X, estratégia Y funcionou
  ou não".
- **Method Engine** (fase futura) consome AMBAS: precisa das Questions
  pra escolher próximo item, precisa da Knowledge pra montar explicação
  quando o aluno erra.

## O que NÃO fazer

- **NÃO** salvar `Question` como Source. Isso confunde retrieval e
  quebra permissões.
- **NÃO** deixar o LLM inventar Questions "oficiais" — se
  `source.kind = "official-exam"`, precisa `externalRef` e revisão
  humana. Copiar prova oficial errada é pior do que não ter aquela
  prova.
- **NÃO** usar `authorityTier`/`provenance` no Question — o esquema é
  diferente. Question tem `source.kind` próprio.
- **NÃO** iniciar a implementação disso na Fase 1. Vem em fase própria,
  depois de Method Engine ter contrato estável de "peça a próxima
  Question dado esse Learning State e essa meta".

## Trigger de implementação

Question Bank vira prioridade quando:

1. Method Engine (fase futura) precisar de "próxima question" e não
   houver mais como fingir com prompt no LLM;
2. Corretores existentes (`app/api/enem/analyze`, `app/api/ap/analyze`,
   `app/api/gcd/analyze`) começarem a duplicar dados sobre "qual prova
   veio de onde";
3. For hora de armazenar Attempts pra dashboards de professor sobre "o
   que a turma erra mais".

Até lá, este documento registra a decisão. Não construir por conta
própria — quando chegar a hora, revisitar este arquivo pra confirmar
que o shape ainda serve.
