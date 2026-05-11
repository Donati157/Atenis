# Atenis

**O que é.** Atenis é um tutor de estudos com IA pra estudantes brasileiros do **6º ao 12º ano**. Cobre as matérias do currículo brasileiro (BNCC), prepara pra ENEM, vestibulares e AP College Board, e corrige redações com rubricas oficiais (ENEM, AP, GCD).

**Posicionamento estratégico** — esta é a frase que rege todas as decisões de produto:

> "Tutor de estudos com IA, **não** ChatGPT com prompt de professor."

Em prática: a resposta da IA é **calibrada** pela série do aluno (BNCC do ano dele), pela matéria, pelo modo de estudo e pela prep de exame que ele escolheu — tudo combinado num system prompt que o **produto monta**, não que o aluno cola. O diferencial competitivo está aí.

**URL de produção:** `https://v0-educational-iceberg-site.vercel.app`

---

## Para quem está chegando agora

Se você é uma IA (Claude, GPT, Cursor) lendo isto pra ajudar com uma tarefa: comece pelo **glossário** (logo abaixo), depois vai direto pro **walkthrough do system prompt em camadas** (seção 7) — é o coração do produto. Pra mexer em código, use o **cookbook** (seção 12).

Se você é uma pessoa nova no time: leia tudo na ordem. Em ~15 min você sai sabendo o suficiente pra abrir uma issue e tomar decisão.

---

## Glossário de domínio

Termos brasileiros e específicos do projeto que aparecem em todo lugar:

| Termo | O que é |
|---|---|
| **Active Learning** | Modo socrático: a IA dá dicas e pede tentativa antes de entregar resposta. Toggle no chat. |
| **AP College Board** | Programa norte-americano de cursos avançados (Calculus, History, etc.) com prova oficial. |
| **BNCC** | Base Nacional Comum Curricular — currículo oficial brasileiro, define competências/habilidades por ano (ex: `EF08MA13` = Matemática 8º ano, equações 1º grau). Referência primária do Atenis. |
| **Concept SP** | Escola Concept São Paulo, parceira educacional. Foco IB-style + GCD. Currículo da Concept tem prioridade sobre referências gerais quando disponível. |
| **EF / EM** | Ensino Fundamental II (6º–9º ano) / Ensino Médio (10º–12º ano). |
| **ENEM** | Exame Nacional do Ensino Médio (INEP/MEC). Provas anteriores são públicas — pode hospedar e usar livremente. |
| **Fuvest, Unicamp, UERJ** | Vestibulares brasileiros (USP, Unicamp, UERJ respectivamente). |
| **GCD** | Global Citizen Diploma — credencial internacional do consórcio do qual Concept SP participa. 16 elementos de reflexão; 4-5 critérios de rubrica (Reflection / Structure / Evidence / Vocabulary / Global Perspective) na escala exemplifies / meets / approaches / developing. |
| **IB** | International Baccalaureate. Não usamos diretamente, mas Concept SP segue rigor IB-style. |
| **INEP** | Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (MEC). Aplica o ENEM. |
| **PNLD** | Programa Nacional do Livro Didático — livros aprovados pelo MEC. |
| **RLS** | Row Level Security (Postgres/Supabase). Toda tabela com dados do aluno tem `auth.uid() = user_id`. |
| **Rubrica** | Critério de correção. Cada corretor (ENEM, AP, GCD) tem rubrica própria em `lib/{nome}-rubric.ts`. |
| **Série** | Ano escolar. Sinônimo de "year"/"grade". 6º a 12º. |
| **Vestibular** | Provas de ingresso em universidades brasileiras. |
| **X-block** | Bloco de eletivas no horário da Concept (robótica, debate, cinema, etc.). |

---

## Equipe e parceiros

| Pessoa | Papel |
|---|---|
| Davi Donati | CTO e Fundador |
| José Leonardo Abarca | Diretor de Marketing e Business |
| Walter Neto | Diretor da Equipe de Suporte |
| Escola Concept São Paulo | Parceiro Educacional |

---

## Stack técnica

- **Framework:** Next.js 15.2 (App Router, React Server Components, React 19)
- **Linguagem:** TypeScript 5.7 end-to-end
- **Estilização:** Tailwind CSS 3.4 + shadcn/ui (primitives Radix)
- **Banco / Auth / Storage:** Supabase (Postgres + RLS, `@supabase/ssr`)
- **IA:** Vercel AI SDK 5 + Google Gemini 2.5 Flash Lite (`@ai-sdk/google`)
- **Markdown:** `react-markdown` + `remark-gfm` + `remark-breaks`
- **Hospedagem:** Vercel (build + CI a partir do Git)
- **Sub-app experimental** em [`corretor de rubricas/`](corretor%20de%20rubricas/): Next 16 + OpenAI, ainda não integrado.

Versões exatas em [package.json](package.json). Mudou versão? Atualiza este parágrafo.

---

## Mental model do produto

O aluno autenticado abre `/dashboard` e vê:

- **Sidebar** com:
  - 8 matérias: Português, Inglês, Matemática, Natural Science (Física/Química/Biologia em 10º–12º), Social Science, AP Electives, Mentorship, X-block Electives
  - 3 prep de exame: ENEM, Vestibular, AP College Board
  - 3 corretores: Redação ENEM, Correção AP, Ensaio GCD
  - 4 modos de estudo: Explicar, Revisar, Exercícios, Simulado
  - Toggle Active Learning (modo socrático)
- **Chat central** que adapta a resposta com base na combinação selecionada
- **Outras áreas** (`/dashboard/insights`, `/material`, `/plan`, `/students/[id]`, `/teachers/[id]`): planos de estudo gerados por IA, materiais, insights de aprendizado, gestão admin/professor.

**A diferença vs ChatGPT.** Em ChatGPT o usuário cola um prompt de "seja meu professor". Em Atenis, **o produto monta o system prompt** toda mensagem com base em (i) série do aluno autenticado vinda do `profiles`, (ii) seleção da sidebar, (iii) regras pedagógicas do projeto. O aluno só escreve a pergunta — o resto é construído por trás.

Isso significa que a mesma pergunta ("explica equação do segundo grau") gera respostas diferentes pra um aluno do 8º ano (vai por Bhaskara aplicado à BNCC do EF) e do 11º (faz interdisciplinaridade com física, prepara pro estilo ENEM).

---

## Arquitetura em alto nível

```
[Estudante]
    │  HTTPS
    ▼
[Next.js 15 — App Router (Vercel)]
    │             │
    │             └─► [Supabase]
    │                  • Auth (cookies via @supabase/ssr)
    │                  • Postgres com RLS por user_id
    │                  • Storage (mídias dos conteúdos)
    ▼
[/api/chat — runtime Node, maxDuration 30s]
    │  monta system prompt em camadas
    │  (BASE → série → matéria → sub-matéria
    │   → prep de exame → corretor → modo de estudo)
    │
    ▼  streamText (Vercel AI SDK 5)
[Google Gemini 2.5 Flash Lite]
    │  resposta em streaming
    ▼
[useChat no front] → UI com tokens chegando em tempo real
```

**Fluxo end-to-end:**

1. Aluno autenticado envia mensagem do front (`useChat`).
2. Route handler `/api/chat` recebe `{messages, subject, subSubject, examPrep, corrector, studyMode, activeLearning}`.
3. Busca `grade_level` e `full_name` em `profiles` via Supabase server client.
4. Concatena os 7 fragmentos do system prompt (ver seção 7).
5. Chama `streamText({ model: google("gemini-2.5-flash-lite"), system, messages })`.
6. Retorna `result.toUIMessageStreamResponse()` — stream chega no `useChat` como tokens.

Persistência (perfil, planos de estudo, eventos de aprendizado, atribuições) é toda em Supabase com RLS isolando dados por usuário.

---

## O coração do produto: system prompt em camadas

**Por que camadas, não um prompt único?**

- **Modularidade.** Matéria, prep de exame e corretor são ortogonais. Aluno pode estar em "Matemática + ENEM + modo Simulado" ou "Português + corretor Redação ENEM + Active Learning" — produto cartesiano.
- **Reuso.** Mesma matéria serve do 6º ao 12º — o que muda é a camada de série (BNCC do ano).
- **Manutenção.** Adicionar matéria nova = adicionar 2 entries em [lib/subjects.ts](lib/subjects.ts). Sem mexer em mais nada.

**As 7 camadas** ([app/api/chat/route.ts:233-241](app/api/chat/route.ts)):

```
systemParts = [
  BASE_SYSTEM,                           // sempre
  gradeContextPrompt(grade, name),       // sempre (com fallback se admin/sem login)
  SUBJECT_PROMPTS[subject],              // se selecionou matéria
  SUB_SUBJECT_PROMPTS[subSubject],       // se Natural Science 10º–12º
  EXAM_PROMPTS[examPrep],                // se selecionou ENEM/Vestibular/AP
  CORRECTOR_PROMPTS[corrector],          // se selecionou corretor
  STUDY_MODE_PROMPTS[studyMode],         // se selecionou modo
  ACTIVE_LEARNING_PROMPT,                // se toggle ligado
].filter(Boolean).join("\n\n")
```

Cada camada:

1. **BASE_SYSTEM** ([route.ts:90-188](app/api/chat/route.ts)). Define missão, hierarquia de fontes (BNCC > Concept SP > provas oficiais > acadêmico), diretrizes pedagógicas (PT-BR, paciência, passo a passo, Markdown, LaTeX), regra "não seja redundante" (não pergunte o que dá pra deduzir), e regra "mensagem do aluno > sidebar" (se aluno digitou tópico que não cabe na matéria selecionada, faz o que ele pediu).

2. **gradeContextPrompt** ([route.ts:30-86](app/api/chat/route.ts)). Injeta nome e série, e adapta o nível. **Regra ABSOLUTA**: a IA nunca rotula uma prova como "Simulado ENEM/Fuvest/AP" por escolha própria — só se o aluno escreveu literalmente o nome do exame. Default é "Simulado de [matéria]". Razão: aluno do 8º ano pedindo "simulado" não está pedindo ENEM.

3. **SUBJECT_PROMPTS** ([lib/subjects.ts:69](lib/subjects.ts)). 8 matérias, cada uma com 1 parágrafo de foco. Ex: Matemática enfatiza álgebra/geometria/cálculo; Mentorship é tutoria interdisciplinar.

4. **SUB_SUBJECT_PROMPTS** ([lib/subjects.ts:54](lib/subjects.ts)). Só Natural Science tem sub-áreas (Física/Química/Biologia) e só aparecem em 10º–12º.

5. **EXAM_PROMPTS** ([lib/subjects.ts:88](lib/subjects.ts)). 3 estilos: ENEM (interdisciplinar, leitura), Vestibular (Fuvest/Unicamp/UERJ), AP (terminologia inglesa, MCQ + FRQ).

6. **CORRECTOR_PROMPTS** ([lib/subjects.ts:97](lib/subjects.ts)). 3 corretores. Componentes dedicados (`/api/enem/analyze`, `/api/ap/analyze`, `/api/gcd/analyze`) usam rubricas em [lib/enem-rubric.ts](lib/enem-rubric.ts), [lib/ap-rubric.ts](lib/ap-rubric.ts), [lib/gcd-rubric.ts](lib/gcd-rubric.ts) diretamente — o `CORRECTOR_PROMPTS` aqui é fallback pro chat livre.

7. **STUDY_MODE_PROMPTS** ([lib/study-modes.ts:19](lib/study-modes.ts)). 4 modos:
   - **Explicar** — conteúdo do zero.
   - **Revisar** — resumo + 3 mini-quiz.
   - **Exercícios** — questões guiadas com feedback (não dá resposta antes do aluno tentar).
   - **Simulado** — prova completa estilo ENEM por padrão (5 questões).

8. **ACTIVE_LEARNING_PROMPT** ([lib/study-modes.ts:99](lib/study-modes.ts)). Adicional ao modo selecionado. Regra: 1 dica → erro aponta sem corrigir → 2-3 tentativas antes da resposta → pergunta de verificação.

### Exemplo trabalhado

**Aluno:** Pedro, 11º ano. **Sidebar:** Matemática + prep ENEM + modo Simulado. **Active Learning:** desligado.

System prompt resultante (`systemParts.join("\n\n")`) tem ~6 fragmentos concatenados:

```
[BASE_SYSTEM — missão, fontes, diretrizes, anti-redundância, sidebar < mensagem]

[gradeContextPrompt:
  Nome: Pedro. Série: 11º ano (2º ano do Ensino Médio).
  Limite escopo ao que ele JÁ DEVE TER VISTO até 11º (BNCC EM*).
  Se pedir ENEM, faça mas avise sobre tópicos do 12º ano não cobertos.
  REGRA ABSOLUTA: nunca rotular como "Simulado ENEM" por escolha própria...]

[SUBJECT_PROMPTS["matematica"] — foco em álgebra/geometria/cálculo]

[EXAM_PROMPTS["enem"] — questões interdisciplinares, leitura, resolução comentada]

[STUDY_MODE_PROMPTS["simulate"] — prova completa, 5 questões, correção ao final]
```

Pedro pergunta: *"me dá um simulado de função quadrática"*.

Como ele **disse "ENEM" indiretamente** (prep selecionada) **e disse "simulado"** explicitamente, a IA pode rotular como "Simulado ENEM de Função Quadrática". Adapta nível ao 11º ano (BNCC EM13MAT302 — funções quadráticas), 5 questões, estilo ENEM com texto-base, e devolve correção comentada no final.

Se Pedro fosse do 8º ano, a regra absoluta dispara: a IA chamaria de "Simulado de Matemática" e adaptaria ao BNCC EF08MA*.

### Implicação pra desenvolvedor

Se você precisa **mudar comportamento global** da IA (ex: "sempre cite habilidade BNCC quando disponível"), edita BASE_SYSTEM em [route.ts:90](app/api/chat/route.ts).

Se precisa **ajustar comportamento por matéria**, edita o entry correspondente em `SUBJECT_PROMPTS` em [lib/subjects.ts:69](lib/subjects.ts).

Se precisa **adicionar matéria nova**, ver receita no cookbook (seção 12).

---

## Estrutura de arquivos

```
app/
├── page.tsx                       # Landing page
├── layout.tsx                     # Root layout (fontes, Vercel Analytics)
├── ajuda/                         # Página de ajuda/suporte
├── auth/
│   ├── login/                     # Login email + senha (Supabase real)
│   ├── sign-up/                   # Cadastro com nome, série, role
│   ├── sign-up-success/
│   ├── complete/                  # Completar perfil pós-signup
│   ├── forgot-password/
│   ├── reset-password/
│   └── error/
├── dashboard/
│   ├── page.tsx                   # Chat principal protegido
│   ├── insights/                  # Insights de aprendizado
│   ├── material/                  # Materiais de estudo
│   ├── plan/{page,new}/           # Planos de estudo
│   ├── students/[id]/             # Gestão de aluno
│   └── teachers/[id]/             # Gestão de professor
└── api/
    ├── chat/route.ts              # Streaming Gemini + system prompt em camadas
    ├── enem/analyze/              # Correção ENEM (5 competências × 200pts)
    ├── ap/{analyze,correct-part}/ # Correção AP College Board
    ├── gcd/{analyze,correct-part}/# Correção ensaio GCD
    └── study-plan/generate/       # Geração de plano de estudos com IA

components/
├── chat-dashboard.tsx             # Shell do dashboard (sidebar + header)
├── chat-interface.tsx             # Área de chat com sugestões contextuais
├── chat-message.tsx               # Mensagem individual (markdown p/ assistente)
├── login-form.tsx, sign-up-form.tsx, complete-signup-client.tsx
├── auth-shell.tsx                 # Layout das telas de auth
├── attachment-picker.tsx, tutor-home.tsx
├── ap/, enem/, gcd/               # UIs dos corretores
├── insights/, plan/               # Insights e plano de estudo
├── students/, teachers/, teaching/# Gestão e atribuição de conteúdo
└── ui/                            # shadcn primitives

lib/
├── subjects.ts                    # Matérias por série + prep + corretores + system prompts
├── study-modes.ts                 # explain/review/practice/simulate + Active Learning
├── enem-rubric.ts                 # Rubrica ENEM (5 competências × 200 pts)
├── gcd-rubric.ts                  # Critérios GCD (exemplifies/meets/approaches/developing)
├── ap-rubric.ts                   # Rubricas AP (Calc, History, English, Sciences)
├── ap-courses.ts                  # Metadados dos cursos AP
├── ap-world-mcq-2020.ts           # Banco MCQ AP World History 2020
├── learning-events.ts             # Tipos de evento (scaffolding p/ gamificação)
├── use-draft.ts                   # Hook de rascunho
├── utils.ts                       # cn() helper (Tailwind merge)
└── supabase/
    ├── env.ts                     # Validação NEXT_PUBLIC_SUPABASE_*
    ├── client.ts                  # Browser client (client components)
    ├── server.ts                  # Server client (RSC + route handlers)
    └── middleware.ts              # Refresh de sessão + guard de rotas

scripts/                           # Migrations SQL (ver seção Banco de dados)
corretor de rubricas/              # Sub-app standalone GCD (Next 16 + OpenAI, experimental)
middleware.ts                      # Wrapper Next que chama lib/supabase/middleware
```

---

## Banco de dados (Supabase)

**Projeto:** `educational_iceberg`
**ID:** `vvowrrflcldkvmhoyvmz`
**URL:** `https://vvowrrflcldkvmhoyvmz.supabase.co`

### Tabelas principais

| Tabela | Função |
|---|---|
| `profiles` | id, full_name, grade_level (6º–12º), role (`student`/`professor`/`admin`), `hidden_from_staff` |
| `subjects` | Matérias suportadas (espelha em parte `lib/subjects.ts`) |
| `content` | Conteúdo educacional por subject + grade_level + content_type (`enem`/`vestibular`/`ap_college_board`/`general`) |
| `quiz_questions` | 4 opções, gabarito, explicação, vinculadas a content |
| `user_progress` | completed, quiz_score, last_accessed |
| `learning_events` | Eventos de aprendizado (scaffolding p/ insights e futura gamificação) |
| `study_plans` | Planos de estudo gerados por IA |
| `teacher_grades` | Mapeamento professor → séries que leciona |
| `teaching_content`, `teaching_assignments` | Conteúdo e atribuições do professor |

### Sequência de migrations

Ordem importa. Rodar no SQL Editor do Supabase em ordem numérica.

| Arquivo | O que faz |
|---|---|
| `001_create_tables.sql` | Cria 5 tabelas iniciais + RLS standard |
| `002_profile_trigger.sql` | Trigger `handle_new_user` (signup → cria profile com role seguro) |
| `003_update_grade_levels.sql` | Atualiza enums de grade_level |
| `004_roles_and_remove_ap.sql` | Refina sistema de roles |
| `005_promote_admin.sql` | Helper SQL pra promover usuário a admin |
| `006_fix_schema.sql` | Correções de schema |
| `007_promote_admin_gmail.sql` | Promoção específica do `admin@gmail.com` |
| `008_nuclear_reset.sql` | Helper de dev (limpa dados — **não rodar em prod**) |
| `009_staff_access.sql` | Permissões de staff |
| `010_learning_and_plans.sql` | Cria `learning_events` e `study_plans` |
| `011_teacher_grades.sql` | Mapeamento professor → séries |
| `012_staff_update_student.sql` | Staff pode editar profiles de alunos |
| `013_fix_events_rpc.sql` | Correção em RPC de eventos |
| `014_apply_signup_intent.sql` | Apply intent vindo do form de signup |
| `015_list_professors.sql` | RPC pra listar professores |
| `016_hide_staff_from_gestao.sql` | `hidden_from_staff=true` esconde demos da gestão |
| `017_teaching_content.sql` | Cria `teaching_content` |
| `018_teaching_assignments.sql` | Cria `teaching_assignments` |
| `RUN_ME_*.sql` | Versões consolidadas/corrigidas pra executar em batch |

### RLS

Toda tabela com dados do aluno tem RLS habilitada com política `auth.uid() = user_id`. A anon key é pública por design — segurança vem do RLS, não de esconder a chave.

---

## Auth e papéis

**Signup** ([components/sign-up-form.tsx](components/sign-up-form.tsx)):

```
Form (nome, email, senha, série, role)
  → supabase.auth.signUp({ data: { full_name, grade_level, role } })
  → trigger handle_new_user lê raw_user_meta_data
  → INSERT em profiles
     • role = 'student' OU 'professor' (qualquer outro vira 'student' por segurança)
     • admin nunca vem do signup — só por SQL (005, 007)
  → redirect /auth/sign-up-success
```

**Login** ([components/login-form.tsx](components/login-form.tsx)):

```
Form (email, senha)
  → supabase.auth.signInWithPassword
  → middleware.ts refresca sessão em toda request
  → guards em lib/supabase/middleware.ts:
     • sem sessão + rota protegida → /auth/login?next=...
     • com sessão + falta grade_level (student) → /auth/complete
     • com sessão + falta teaching_grades (professor) → /auth/complete
     • com sessão + rota /auth/* → /dashboard
```

**Promoção a admin.** Roda no SQL Editor:

```sql
update profiles set role = 'admin' where id = '<uuid-do-usuario>';
```

Ou edita [scripts/007_promote_admin_gmail.sql](scripts/007_promote_admin_gmail.sql) e roda. Nunca expõe rota HTTP de "promover a admin".

**Hide-from-staff.** Contas de teste (`admin@gmail.com`, `claudia`, `miriam`, `demo@gmail.com`) têm `hidden_from_staff=true` ([scripts/016_hide_staff_from_gestao.sql](scripts/016_hide_staff_from_gestao.sql)) pra não poluírem a UI de gestão.

---

## Funcionalidades atuais

Agrupadas por área:

**Auth**
- Login email/senha, signup com nome+série+role, recuperação de senha
- Fluxo "completar perfil" pra usuários incompletos
- Middleware refresca sessão e aplica guards

**Tutor (chat)**
- Sidebar com matérias, sub-matérias, prep, corretor, modo de estudo, Active Learning
- System prompt em 7 camadas (ver seção 7)
- Streaming de tokens via Vercel AI SDK 5 + Gemini 2.5 Flash Lite

**Corretores** (componentes dedicados, não passam pelo `/api/chat`)
- ENEM Redação: 5 competências × 200 pts ([app/api/enem/analyze/route.ts](app/api/enem/analyze/route.ts))
- AP Mock: rubricas oficiais por curso ([app/api/ap/analyze/route.ts](app/api/ap/analyze/route.ts))
- GCD Ensaio: 4-5 critérios em escala 4 níveis ([app/api/gcd/analyze/route.ts](app/api/gcd/analyze/route.ts))

**Plano de estudos**
- Geração via IA ([app/api/study-plan/generate/route.ts](app/api/study-plan/generate/route.ts))
- Listagem e criação ([app/dashboard/plan/](app/dashboard/plan/))

**Painel admin/professor**
- Gestão de alunos ([app/dashboard/students/[id]/](app/dashboard/students/))
- Gestão de professores ([app/dashboard/teachers/[id]/](app/dashboard/teachers/))
- Atribuição de conteúdo de ensino, insights, materiais

**Sub-app experimental**
- [`corretor de rubricas/`](corretor%20de%20rubricas/) — corretor GCD standalone (Next 16 + OpenAI). Não está integrado.

---

## Cookbook "como fazer X"

Receitas curtas pra operações comuns. Siga em ordem; cada passo é verificável.

### Adicionar matéria nova

1. Em [lib/subjects.ts](lib/subjects.ts):
   - Adicionar entry em `SUBJECTS` (`{ id, label, emoji }`)
   - Adicionar entry em `SUBJECT_PROMPTS[id]` com 1 parágrafo do foco
   - Atualizar `SUBJECTS_BY_GRADE` se a matéria não estiver disponível em todas as séries
2. Se tiver sub-áreas (tipo Física/Química/Bio), seguir padrão de `SUB_SUBJECTS.natural_science`
3. UI atualiza automaticamente — `chat-interface.tsx` lê de `SUBJECTS`

### Criar corretor novo

1. Criar [lib/{nome}-rubric.ts](lib/) com a rubrica (espelha estrutura de `gcd-rubric.ts`)
2. Em [lib/subjects.ts](lib/subjects.ts):
   - Adicionar entry em `CORRECTORS` e em `CORRECTOR_PROMPTS`
3. Criar `app/api/{nome}/analyze/route.ts` (espelha `app/api/enem/analyze/route.ts`)
4. Criar UI em `components/{nome}/`
5. Plug na sidebar do `chat-dashboard.tsx`

### Mudar modelo de IA

Editar [app/api/chat/route.ts:244](app/api/chat/route.ts):

```ts
model: google("gemini-2.5-flash-lite"),
```

Se trocar provider (ex: voltar pra OpenAI), atualizar import e adicionar dep em `package.json`. Conferir `AI_GATEWAY_API_KEY` no `.env.local` e nas env vars da Vercel.

### Adicionar série/grade

1. [lib/subjects.ts](lib/subjects.ts) `SUBJECTS_BY_GRADE` — adicionar chave nova
2. [app/api/chat/route.ts:20](app/api/chat/route.ts) `GRADE_LABELS` — adicionar label
3. [app/api/chat/route.ts:30](app/api/chat/route.ts) `gradeContextPrompt` — adicionar branch no `if/else if` de level guidance
4. Forms de signup ([components/sign-up-form.tsx](components/sign-up-form.tsx)) e complete profile ([components/complete-signup-client.tsx](components/complete-signup-client.tsx))

### Rodar SQL no Supabase

1. Dashboard Supabase → SQL Editor
2. Ordem numérica dos arquivos em [scripts/](scripts/)
3. Pra batches consolidados, usar arquivos `RUN_ME_*.sql`
4. **Antes de prod:** sempre rodar primeiro num projeto de dev/staging

### Criar nova rota de API com IA

Padrão de [app/api/study-plan/generate/route.ts](app/api/study-plan/generate/route.ts):

```ts
1. Parse body com tipos
2. Auth check via createClient() do server
3. Buscar profile pra contexto se precisar
4. Montar system prompt (idealmente reusando lib/)
5. Chamar streamText({ model: google("gemini-2.5-flash-lite"), system, messages })
6. return result.toUIMessageStreamResponse()
7. export const maxDuration = 30
```

### Promover usuário a admin

```sql
-- SQL Editor do Supabase:
update profiles set role = 'admin' where id = '<uuid>';
-- Ou by email:
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'pessoa@dominio.com');
```

Nunca expor rota HTTP de promoção.

### Esconder conta demo da gestão

```sql
update profiles set hidden_from_staff = true where id = '<uuid-da-conta-demo>';
```

Ver [scripts/016_hide_staff_from_gestao.sql](scripts/016_hide_staff_from_gestao.sql).

---

## Riscos / dívida técnica

Em ordem de prioridade:

1. **Alto — `/api/chat` sem rate limit nem auth gate forte.** Gemini Flash Lite é mais barato que GPT-5, mas o endpoint ainda fica vulnerável a abuso. Adicionar Upstash rate limit + checagem de sessão obrigatória antes do `streamText`.
2. **Alto — Sem testes automatizados.** Não há Vitest/Playwright. Considerar smoke tests pelo menos nos corretores ENEM/AP/GCD — regressão silenciosa em rubrica é caríssima.
3. **Alto — Sem observabilidade.** Sem Sentry/LogRocket nem logs estruturados. Em produção, falha do Gemini ou do Supabase é invisível.
4. **Médio — Sub-app `corretor de rubricas/` desalinhado.** Usa OpenAI (não Gemini), Next 16 (não 15.2), prompt próprio. Decidir: integrar como módulo ou descontinuar.
5. **Médio — Gamificação só como scaffolding.** [lib/learning-events.ts](lib/learning-events.ts) existe mas XP/streak/níveis não estão vivos. Risco de o time decidir adicionar ad-hoc — vale alinhar antes (BNCC + Concept SP em primeiro lugar, sempre).

**Resolvidos** (manter no histórico):
- ~~Login só redirecionava~~ → auth Supabase real ([components/login-form.tsx](components/login-form.tsx))
- ~~Supabase config hardcoded~~ → env vars em [lib/supabase/env.ts](lib/supabase/env.ts)
- ~~Senha admin compartilhada em texto puro~~ → confirmar com Davi se foi rotacionada

---

## Roadmap — 7 ideias 2026-04

**Posicionamento.** O que existe hoje é o **básico**: chat por matéria. O diferencial competitivo está nas 7 ideias abaixo, que movem o produto pra "tutor de estudos com IA, não chat por matéria". Quando estiver decidindo prioridade entre features, prefira as que avançam essa direção.

| # | Ideia | Estado atual | Falta |
|---|---|---|---|
| 1 | **IA que acompanha o aluno** (Learning Analytics) | Scaffolding em [lib/learning-events.ts](lib/learning-events.ts) e tabela `learning_events` | Pipeline de coleta + memória de erros frequentes ("errou crase 3 vezes essa semana") + sugestão automática de revisão |
| 2 | **Trilha de estudo automática** | Tabela `study_plans` + endpoint `/api/study-plan/generate` | Diagnóstico inicial via prova adaptativa + plano co-construído com professor da escola |
| 3 | **Correção inteligente ENEM** ⭐ **(ouro)** | Endpoint `/api/enem/analyze` + rubrica em [lib/enem-rubric.ts](lib/enem-rubric.ts) | UX dedicada (upload de redação, feedback granular por competência, histórico, comparação entre versões) — Davi marcou como prioridade alta |
| 4 | **Gamificação leve** | Eventos existem como scaffolding, sem UI | XP por matéria, níveis ("Interpretação nível 3"), streak de dias. Manter opcional/leve, não competição entre alunos |
| 5 | **Modo estudo vs chat livre** | 4 modos já existem em [lib/study-modes.ts](lib/study-modes.ts) | Promover modo estudo a UI primária (📚 Explicação / 🧠 Revisão / 📝 Exercícios / 🎯 Simulado); chat livre vira fallback secundário |
| 6 | **IA que ensina (Active Learning)** | Toggle existe + prompt em [lib/study-modes.ts:99](lib/study-modes.ts) | Produto em volta: indicador visual quando ativo, recompensa quando aluno acerta após dica, integração com #1 |
| 7 | **Tutor completo com IA** | — | Combinação de 1–6: monta plano, acompanha erros, aplica exercícios, corrige, mostra evolução. É o "norte" do produto |

---

## Configurações recomendadas no Supabase (Auth)

- **Allow new user signups:** ligado em produção; desligar para beta privado.
- **Confirm email:** ligado em produção (impede cadastro com e-mail falso). Pode desligar em dev.
- **Allow anonymous sign-ins:** ligado — permite "experimentar sem cadastro" e depois converter em conta real (ótimo pra onboarding educacional).
- **Allow manual linking:** desligado por padrão; só ligar com caso de uso específico de `linkIdentity()`.

---

## Convenções

- **Idioma.** Tudo em PT-BR (UI, mensagens de erro, system prompts, comentários de código).
- **Componentes.** shadcn/ui é o padrão. Só criar componente custom quando o primitivo não atende.
- **Server vs client.** Server Component por padrão. `"use client"` só quando precisa de hook/estado/event handler/browser API.
- **Supabase clients.** [lib/supabase/server.ts](lib/supabase/server.ts) em RSC e route handlers; [lib/supabase/client.ts](lib/supabase/client.ts) só em client components.
- **Rotas API.** App Router (`app/api/.../route.ts`). Pra LLM, definir `maxDuration` (atualmente 30s no `/api/chat`); migrar pra edge runtime quando o handler for puramente streaming.
- **Env vars.** `NEXT_PUBLIC_*` só pro que pode ir no bundle do cliente. Segredos sem prefixo: `AI_GATEWAY_API_KEY` (Gemini via Vercel AI Gateway), service role key da Supabase quando precisar.
- **Não commitar** `.env.local`, chaves, prints com tokens.
- **Copyright AP.** Nunca redistribuir material com copyright do College Board. Linkar AP Central, gerar conteúdo original com base no Course and Exam Description (CED).
- **Provas brasileiras.** ENEM (INEP) e vestibulares são públicos — pode hospedar e usar livremente.
- **Schema changes.** Sempre gerar migration explícita em [scripts/](scripts/) e atualizar a tabela "Sequência de migrations" deste arquivo.

---

## Como conversar comigo (Claude/IA)

Pra sessões futuras de IA trabalhando neste repo:

- **Review de código** → comece pelos riscos da seção "Riscos / dívida técnica" e proponha correções nessa ordem.
- **Criar feature X** → primeiro confirme se toca em auth/dados sensíveis. Se sim, comece pelos pontos críticos antes.
- **Mudança de schema** → gerar migration explícita em [scripts/](scripts/) + atualizar tabela "Sequência de migrations" aqui.
- **Conteúdo de prova** → AP segue regra de copyright (CED, não material oficial); ENEM/vestibular são livres.
- **Mudança em system prompt** → cada camada tem um arquivo (ver seção 7); não inline strings em `route.ts` — coloque em [lib/](lib/).
- **Adicionar feature do roadmap** → consultar a tabela "Roadmap — 7 ideias 2026-04" e identificar qual ideia ela serve. Decisão de produto: priorizar #3 (correção ENEM) e features que movem em direção ao posicionamento "tutor com IA".

**Memória persistente** do Davi (preferências, contexto, histórico) está em:
`~/.claude/projects/-Users-davidonati-Documents-Claude-Projects-Edu-Iceberg/memory/MEMORY.md`

Sempre vale dar uma olhada antes de planejar mudanças grandes.

### Ambiente local da máquina do Davi (heads-up pra IA)

`node`, `npm` e `npx` **não estão no `$PATH` padrão** desta máquina. Estão em `~/.local/node/bin/`. Se você (IA) tentar rodar `npm`, `npx`, `tsc` direto vai dar `command not found` ou `env: node: No such file or directory` — não é problema de permissão, é só PATH.

Pra rodar typecheck, dev server, instalar dep, etc., prefixe o PATH:

```bash
PATH="$HOME/.local/node/bin:$PATH" npx tsc --noEmit
PATH="$HOME/.local/node/bin:$PATH" npm run dev
PATH="$HOME/.local/node/bin:$PATH" npm install <pacote>
```

Versão atual: Node v22.11.0. Se essa versão mudar, atualizar aqui.
