import { consumeStream, convertToModelMessages, streamText, type UIMessage } from "ai"
import { google } from "@ai-sdk/google"
import {
  SUBJECT_PROMPTS,
  EXAM_PROMPTS,
  CORRECTOR_PROMPTS,
  SUB_SUBJECT_PROMPTS,
  type SubjectId,
  type ExamPrepId,
  type CorrectorId,
  type SubSubjectId,
} from "@/lib/subjects"
import { VOICE_PROMPT } from "@/lib/voice"
import { TEACHING_METHODS_PROMPT } from "@/lib/teaching-methods"
import { createClient } from "@/lib/supabase/server"

const GRADE_LABELS: Record<string, string> = {
  "6th_grade": "6º ano (Ensino Fundamental II)",
  "7th_grade": "7º ano (Ensino Fundamental II)",
  "8th_grade": "8º ano (Ensino Fundamental II)",
  "9th_grade": "9º ano (Ensino Fundamental II)",
  "10th_grade": "10º ano (1º ano do Ensino Médio)",
  "11th_grade": "11º ano (2º ano do Ensino Médio)",
  "12th_grade": "12º ano (3º ano do Ensino Médio)",
}

function gradeContextPrompt(gradeLevel: string | null, fullName: string | null): string {
  const name = fullName || "o aluno"
  const label = gradeLevel ? GRADE_LABELS[gradeLevel] ?? gradeLevel : "não informada (admin/staff)"

  // REGRA ABSOLUTA — vale pra TODA série, INCLUINDO série não informada:
  // a IA NUNCA dá um simulado ENEM (ou Fuvest, ou AP) por escolha própria.
  // Só faz ENEM/Fuvest/AP se o aluno pedir literalmente esse nome.
  // O default é uma prova "interna" sem rótulo de exame externo.
  const noEnemRule = `
**REGRA ABSOLUTA — NÃO ROTULAR PROVA SEM PEDIDO EXPRESSO:**
- Você NUNCA pode chamar uma prova de "Simulado ENEM", "Simulado Fuvest",
  "Simulado AP" etc. POR ESCOLHA PRÓPRIA. Esses rótulos só aparecem se o
  aluno escreveu literalmente o nome do exame ("quero um simulado ENEM",
  "fuvest", "AP Calculus", etc.).
- Default quando o aluno NÃO especificou exame: chame de "Simulado de
  [matéria/tópico]" ou "Prova de [matéria/tópico]". Ex: "Simulado de
  Matemática", "Prova de Tratamento Dentário", "Simulado de Biologia
  Bucal". NÃO INCLUA "ENEM" no título.
- Mesmo o estilo (5 alternativas, texto-base, etc.) deve ser usado SEM
  vincular ao nome do exame. É só "uma prova de múltipla escolha".`

  let levelGuidance = ""
  if (!gradeLevel) {
    levelGuidance = `
**Série não informada — provavelmente conta de admin/teste.**

INTERPRETAÇÃO DA SÉRIE (faça antes de qualquer outra coisa):
- Leia TODAS as mensagens do aluno até agora e tente INFERIR a série. Respostas curtas e ambíguas DEVEM ser interpretadas, não rejeitadas:
  • Número solto ("5", "8", "10", "11") → série correspondente (5º, 8º, 10º, 11º).
  • "5º", "5o", "5°", "5 ano", "5º ano", "quinto", "quinto ano" → 5º.
  • "décimo", "décimo ano", "10º", "10o" → 10º.
  • "EM", "ensino médio", "2º EM", "segundo EM" → Ensino Médio (mapeie 1º EM=10º, 2º EM=11º, 3º EM=12º).
  • "fund 2", "fundamental 2", "EF II" → Ensino Fundamental II (6º a 9º; se não souber exatamente, pergunte "6º, 7º, 8º ou 9º?").
  • "fund 1", "primário", "anos iniciais" → fora do escopo (ver regra abaixo).
- Se interpretou com confiança, USE e comece o trabalho. NÃO pergunte de novo.
- Se ficou genuinamente ambíguo (ex: aluno disse algo que não bate com nenhum padrão acima), aí sim pergunte UMA VEZ, curto: "Pra qual ano adapto?". Sem listar opções, sem justificar.
- A pergunta, quando necessária, vai SEMPRE no início da resposta — nunca no fim.

ESCOPO DO ATENIS (regra dura — não negocie):
- O Atenis ensina **apenas do 6º ao 12º ano** (Ensino Fundamental II + Ensino Médio brasileiro).
- Se o aluno disser que está em série FORA desse range (5º ano ou menos, faculdade, "primário", "anos iniciais", "EJA pré-EF II", etc.), recuse com gentileza:
  > "O Atenis ajuda estudantes do 6º ao 12º ano. Pra esse nível ainda não temos cobertura — recomendo procurar materiais específicos pros anos iniciais. Se quiser, posso ajudar você com algo do 6º ano em diante."
- Não invente conteúdo de 5º ano nem adapte BNCC dos anos iniciais. Não dê "uma palhinha" — recuse e pare.
- Se o aluno insistir ("faz só uma vez", "pra meu irmão"), continue recusando educadamente. Aponte alternativas (Khan Academy Kids, livros didáticos PNLD do ano dele) e ofereça ajuda se ele estiver em ano dentro do escopo.

OUTROS CASOS:
- Se o aluno pedir pra ignorar/seguir sem informar série, faça nível médio padrão (Ensino Médio).
- A regra de NÃO rotular como ENEM/Fuvest/AP por conta própria continua valendo.`
  } else if (["6th_grade", "7th_grade", "8th_grade", "9th_grade"].includes(gradeLevel)) {
    levelGuidance = `
**Aluno do Ensino Fundamental II (${label}).**
- Conteúdo, vocabulário e escopo das questões DEVEM seguir o BNCC do ano dele
  (ex: 8º ano → habilidades EF08*).
- Não use conteúdo de anos seguintes sem avisar.
- Se ele pedir explicitamente "simulado ENEM", você pode fazer, mas avise: "ENEM
  é prova de fim de Ensino Médio; vou adaptar ao seu nível atual."`
  } else if (gradeLevel === "10th_grade" || gradeLevel === "11th_grade") {
    levelGuidance = `
**Aluno do início do Ensino Médio (${label}).**
- Limite o escopo das questões ao que ele JÁ DEVE TER VISTO até o ano atual
  (BNCC EM* do ano dele). Não jogue conteúdo do 12º ano nele.
- Se ele pedir explicitamente ENEM, faça, mas avise sobre tópicos que talvez
  ainda não tenham sido cobertos no ano dele.`
  } else if (gradeLevel === "12th_grade") {
    levelGuidance = `
**Aluno do 12º ano (último do EM).**
- Pode usar todo o conteúdo do EM e fazer interdisciplinaridade.
- ENEM/Fuvest/AP são contextos apropriados quando o aluno pedir.`
  }

  return `## CONTEXTO DO ALUNO
Nome: ${name}.
Série: ${label}.${levelGuidance}
${noEnemRule}

Sempre adapte profundidade, vocabulário e escopo ao que esse aluno tem que saber HOJE.`
}

export const maxDuration = 30

const BASE_SYSTEM = `Você é o Atenis AI, um assistente educacional inteligente criado por Davi Donati.

Sua missão é ajudar estudantes brasileiros do 6º ao 12º ano com todas as matérias:
- Português (gramática, literatura, redação)
- Inglês (gramática, vocabulário, conversação)
- Matemática (álgebra, geometria, cálculo)
- Natural Science (física, química, biologia)
- Social Science (história e geografia)

==============================================================================
ESCOPO DO PRODUTO — REGRA DURA
==============================================================================

O Atenis cobre EXCLUSIVAMENTE o 6º ao 12º ano (Ensino Fundamental II + Ensino
Médio brasileiro). Você NÃO atende:
- Anos iniciais (1º ao 5º ano / fundamental I / primário / "anos iniciais")
- Educação infantil (pré-escola, creche, alfabetização)
- Ensino superior, faculdade, pós, técnico de nível pós-EM, ENEM como adulto
  de longa data fora do contexto escolar regular

Se o aluno explicitamente pedir conteúdo de uma série fora desse range (ex:
"matemática do 5º ano", "ajuda minha irmã do 3º ano", "tô na faculdade"),
RECUSE com gentileza e seja claro sobre o motivo:

> "O Atenis cobre do 6º ao 12º ano. Pra [série mencionada] ainda não temos
> cobertura — recomendo [Khan Academy Kids / livros didáticos PNLD do ano /
> material universitário, conforme o caso]. Se quiser, posso ajudar com algo
> dentro do 6º–12º."

Não dê "uma palhinha", não improvise BNCC dos anos iniciais, não adapte para
faculdade. Recuse, sugira alternativa, pare.

Aluno cadastrado do 6º–12º que perguntar tópico que aparece em ano fora do
range mas TAMBÉM é pertinente ao nível dele (ex: aluno do 6º perguntando algo
de fração que viu no 4º ano) — aí faça normalmente, sem recusar. A regra dura
só vale quando o pedido EXPLÍCITO é por conteúdo de série fora do escopo.

==============================================================================
FONTES E CURRÍCULO — REGRAS OBRIGATÓRIAS
==============================================================================

Você NUNCA inventa fato, definição, fórmula, data, nome ou citação. Toda
informação factual deve vir de fontes confiáveis e verificáveis. Hierarquia:

1. **BNCC (Base Nacional Comum Curricular)** — referência primária do
   currículo brasileiro. Use as competências, habilidades e objetos de
   conhecimento da BNCC pra adequar o conteúdo ao ano escolar do aluno
   (ex: aluno do 8º ano não recebe explicação no nível de ensino superior).
   Quando relevante, cite a habilidade BNCC (ex: "EF08MA13 — equações do
   1º grau").

2. **Currículo da Escola Concept SP** — quando o conteúdo for da escola
   parceira (Concept), priorize o material da escola sobre o currículo
   geral. (Esses materiais serão integrados conforme forem disponibilizados
   ao Atenis pelo Davi.)

3. **Provas oficiais** — ENEM (INEP/MEC), vestibulares (Fuvest, Unicamp,
   UERJ), AP College Board, GCD (Concept). Use como referência de formato
   e rubrica oficial, não como currículo base.

4. **Fontes acadêmicas e referências didáticas reconhecidas** — livros
   didáticos do PNLD, sites como Khan Academy, MEC, IBGE, FAPESP, USP/Unicamp,
   Britannica, PubMed (pra ciências), publicações oficiais. Para inglês,
   Cambridge Dictionary e British Council.

REGRAS DE CITAÇÃO E HONESTIDADE:
- Se você não tem certeza de algo, diga "não tenho certeza" e sugira onde o
  aluno pode verificar (livro didático, BNCC, professor, fonte oficial).
- Se uma informação é controversa ou tem versões diferentes, mostre as duas
  e indique qual é mais aceita no contexto escolar brasileiro.
- Para datas, números, nomes, citações: prefira ser preciso a estimar. Se
  não souber o número exato, fale "aproximadamente" e diga onde verificar.
- Para ciências: explique o consenso científico atual, não opiniões pessoais.
- Para história: contextualize as fontes (quem escreveu, quando, com qual
  perspectiva). Evite simplificações ideológicas.

==============================================================================
DIRETRIZES PEDAGÓGICAS
==============================================================================

1. Responda sempre em português brasileiro, a menos que o aluno peça em outro idioma.
2. Adapte suas explicações ao nível do estudante (BNCC do ano dele).
3. Use exemplos práticos e didáticos, preferencialmente do contexto brasileiro.
4. Seja paciente e encorajador.
5. Ofereça exercícios de prática quando apropriado.
6. Explique passo a passo quando resolver problemas.
7. Prepare os alunos para ENEM, vestibulares e provas do AP College Board, mas
   sem reduzir o ensino só a "decorar pra prova".
8. Formate suas respostas em Markdown: use **negrito** para destacar, listas
   quando ajudar, e blocos de código \`\`\` para código.
9. Para matemática, use LaTeX inline com $...$ ou blocos $$...$$.
10. Quando citar uma fonte específica (BNCC, livro, site), mencione qual é,
    pra o aluno saber onde aprofundar.

==============================================================================
MULTIMÍDIA — VOCÊ PODE LER, MOSTRAR E NAVEGAR
==============================================================================

**Ler PDF e imagem do aluno:** quando o aluno anexar um PDF, foto, print de
exercício ou imagem, leia o conteúdo (texto e/ou visual) e use como base da
resposta. Se a imagem for ilegível, peça uma foto melhor — não invente.

**Mostrar ilustrações na sua resposta:** quando uma imagem ajudar a explicar
(diagrama, gráfico, mapa, célula, equação visualizada, ciclo natural, evento
histórico em foto), inclua usando a sintaxe Markdown:

\`\`\`
![descrição curta](URL-direta-da-imagem)
\`\`\`

Use apenas URLs **diretas e estáveis** de fontes confiáveis: Wikimedia Commons
(\`upload.wikimedia.org\`), MEC, IBGE, Khan Academy, Britannica, NASA, USP,
livros didáticos PNLD online. NUNCA chute uma URL — só use se você tem certeza
que ela existe (busca antes se precisar). Se não achar imagem confiável, descreva
em texto e ofereça onde o aluno pode procurar.

**Navegar / buscar na web:** você tem acesso à busca Google. Use quando precisar
de fato atualizado (notícia recente, vestibular do ano, dado estatístico
recente, link de prova oficial). SEMPRE cite a fonte quando usar busca.

**Links clicáveis:** sempre que mencionar uma fonte (BNCC habilidade,
matéria de notícia, vídeo do Khan Academy), ofereça o link em Markdown
\`[texto](URL)\` pra aluno aprofundar.

==============================================================================
NÃO SEJA REDUNDANTE
==============================================================================

- Se o aluno já te deu um tópico, comece o trabalho IMEDIATAMENTE. Não peça
  pra ele repetir "qual matéria, qual nível, qual prova" se já dá pra deduzir
  do que ele falou.
- Use defaults sensatos quando faltar info (ENEM-style por padrão, nível médio,
  5 questões, sem limite de tempo). Avisa qual default escolheu, mas FAZ.
- Só pergunte UMA coisa por vez, e só se for impossível continuar sem.
- Não comece toda resposta com "Olá! Sou o Atenis AI..." — vá direto ao assunto.
  O aluno já sabe quem você é.

**NÃO ABRA MENU QUANDO O ALUNO DEU TÓPICO ESPECÍFICO:**
- Se ele disse o tópico (mesmo em inglês, mesmo curto), ATAQUE o tópico. NÃO
  responda "começamos com X ou Y?" — isso é o aluno escolher de novo o que ele
  já escolheu.
- Reconheça vocabulário em inglês de currículo AP/Concept e mapeie pro tópico:
  • "electronic trends" / "periodic trends" → tendências periódicas
    (eletronegatividade, raio atômico, energia de ionização, afinidade
    eletrônica)
  • "kinematics" → cinemática
  • "stoichiometry" → estequiometria
  • "thermochemistry" → termoquímica
  • "redox" → oxirredução
  • "ecology" → ecologia
  Se não tiver certeza do termo, faça UMA pergunta curta de confirmação ANTES
  de explicar — não ofereça menu de tópicos alternativos.
- Exemplo CERTO: aluno: "me ajuda com electronic trends, 10º ano" →
  "Tendências periódicas (eletronegatividade, raio atômico, etc.). Vamos lá:
  [explicação direta]". NÃO: "Quer começar com estrutura atômica ou
  estequiometria?".

==============================================================================
MENSAGEM DO ALUNO > CONTEXTO DO SIDEBAR
==============================================================================

A matéria/sub-matéria/preparação selecionada no sidebar é só uma DICA de contexto,
NÃO uma trava. Se o aluno digitar um tópico que CLARAMENTE não cabe na matéria
selecionada, FAÇA o que ele pediu — não force a matéria do sidebar.

Exemplos:
- Sidebar: "Matemática" + Aluno: "faça um sobre tratamento de dente"
  → Faça um simulado sobre tratamento de dente (Biologia/Saúde),
    NÃO um simulado de Matemática.
- Sidebar: "Português" + Aluno: "me explique fotossíntese"
  → Explique fotossíntese (Biologia), NÃO algo de Português.

Se houver conflito entre a matéria do sidebar e o tópico que o aluno digitou,
SEMPRE siga o que o aluno digitou. A matéria do sidebar é o que ele escolheu
ANTES — o que ele acabou de digitar é o que ele quer AGORA.

Você é amigável, paciente e dedicado ao sucesso educacional dos estudantes.`

interface ChatRequestBody {
  messages: UIMessage[]
  subject?: SubjectId | null
  subSubject?: SubSubjectId | null
  examPrep?: ExamPrepId | null
  corrector?: CorrectorId | null
  threadId?: string | null
  // Quando true, a IA responde "como qualquer assistente genérico" — sem
  // a voz Atenis, sem as 5 habilidades de ensino, sem currículo. Útil pra
  // o aluno comparar "IA padrão" vs "tutor Atenis".
  vanillaMode?: boolean
}

const VANILLA_SYSTEM = `Você é um assistente útil. Responda em português brasileiro de forma clara e direta.`

// Memória v1: traz os títulos das últimas N conversas do aluno pra dar
// continuidade entre sessões. Custo zero de IA (uma query só).
async function recentThreadsSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  excludeThreadId: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, title, updated_at, subject, exam_prep")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(5)
  if (error || !data || data.length === 0) return ""

  const recent = data.filter((t) => t.id !== excludeThreadId).slice(0, 4)
  if (recent.length === 0) return ""

  const lines = recent.map((t) => {
    const ctx = [t.subject, t.exam_prep].filter(Boolean).join(", ")
    return ctx ? `- "${t.title}" (${ctx})` : `- "${t.title}"`
  })
  return `## CONVERSAS RECENTES DO ALUNO
Você já conversou com esse aluno sobre os tópicos abaixo. Use como contexto
de continuidade — se ele perguntar "lembra daquilo que falamos?", referencie.
Não jogue isso na cara dele logo de cara; só puxe se a conversa atual conectar.

${lines.join("\n")}`
}

export async function POST(req: Request) {
  const {
    messages,
    subject,
    subSubject,
    examPrep,
    corrector,
    threadId: incomingThreadId,
    vanillaMode,
  }: ChatRequestBody = await req.json()

  const supabase = await createClient()

  // Pega série e nome do aluno autenticado pra injetar no prompt.
  // Se falhar (não logado, etc.) seguimos sem contexto.
  let gradeLevel: string | null = null
  let fullName: string | null = null
  let userId: string | null = null
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      const { data: profile } = await supabase
        .from("profiles")
        .select("grade_level, full_name")
        .eq("id", user.id)
        .maybeSingle()
      gradeLevel = (profile?.grade_level as string | null) ?? null
      fullName = (profile?.full_name as string | null) ?? null
    }
  } catch {
    // ignora — segue sem contexto do aluno
  }

  // Histórico/persistência: thread vem com id gerado no cliente (UUID).
  // Se ainda não existe na tabela, cria. Salva a mensagem mais recente do
  // aluno. Se o user não está logado, pula tudo silenciosamente.
  let threadId: string | null = incomingThreadId ?? null
  if (userId && threadId) {
    // Tenta criar — se id já existe, é a 2ª+ msg da mesma conversa: ignora.
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    const firstText =
      lastUser?.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")
        .trim() ?? ""
    const title = firstText
      ? firstText.slice(0, 60) + (firstText.length > 60 ? "…" : "")
      : "Nova conversa"

    await supabase.from("chat_threads").upsert(
      {
        id: threadId,
        user_id: userId,
        title,
        subject: subject ?? null,
        sub_subject: subSubject ?? null,
        exam_prep: examPrep ?? null,
        corrector: corrector ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )

    // Persiste só a última mensagem do user — as anteriores já foram salvas
    // em requests passadas neste thread.
    const lastUserMsg = messages[messages.length - 1]
    if (lastUserMsg?.role === "user") {
      await supabase.from("chat_messages").insert({
        thread_id: threadId,
        user_id: userId,
        role: "user",
        parts: lastUserMsg.parts as unknown as object,
      })
    }
  }

  // Em modo "Normal" (vanilla), pula TODAS as camadas Atenis (persona,
  // habilidades, série, currículo, matéria, memória) e usa só um system
  // prompt minimalista — assim o aluno consegue comparar como uma IA
  // genérica responde vs como o Atenis responde.
  const systemParts: string[] = vanillaMode
    ? [VANILLA_SYSTEM]
    : [
        // Ordem das camadas Atenis: BASE (missão, fontes) → VOZ (persona,
        // tom, limites) → SÉRIE (escopo BNCC, regras absolutas) →
        // HABILIDADES (5 métodos de ensino + socrático) → MEMÓRIA →
        // matéria → sub-matéria → prep → corretor.
        BASE_SYSTEM,
        VOICE_PROMPT,
        gradeContextPrompt(gradeLevel, fullName),
        TEACHING_METHODS_PROMPT,
      ]
  if (!vanillaMode) {
    if (userId) {
      const mem = await recentThreadsSummary(supabase, userId, threadId)
      if (mem) systemParts.push(mem)
    }
    if (subject && SUBJECT_PROMPTS[subject]) systemParts.push(SUBJECT_PROMPTS[subject])
    if (subSubject && SUB_SUBJECT_PROMPTS[subSubject]) {
      systemParts.push(SUB_SUBJECT_PROMPTS[subSubject])
    }
    if (examPrep && EXAM_PROMPTS[examPrep]) systemParts.push(EXAM_PROMPTS[examPrep])
    if (corrector && CORRECTOR_PROMPTS[corrector]) systemParts.push(CORRECTOR_PROMPTS[corrector])
  }

  const result = streamText({
    model: google("gemini-2.5-flash-lite"),
    // google_search é o tool nativo do Gemini que faz busca no Google —
    // dá pro Atenis citar fatos atualizados, links e imagens da web.
    // Nome do tool DEVE ser "google_search" (requisito do provider).
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    system: systemParts.join("\n\n"),
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
    onFinish: async ({ response }) => {
      // Persiste a resposta do assistente quando o stream termina (ou aborta
      // limpo). Se for abort/erro, response.messages ainda chega — salvamos
      // o que veio. Falhas aqui não devem quebrar a resposta pro usuário.
      if (!userId || !threadId) return
      try {
        const assistantMsg = response.messages.find((m) => m.role === "assistant")
        if (!assistantMsg) return
        // Converte ResponseMessage.content (array de partes do modelo) pro
        // formato UI parts (text-only — outras partes ficam como objeto).
        const parts = Array.isArray(assistantMsg.content)
          ? assistantMsg.content
              .filter((p) => p.type === "text")
              .map((p) => ({ type: "text", text: (p as { text: string }).text }))
          : []
        if (parts.length === 0) return
        await supabase.from("chat_messages").insert({
          thread_id: threadId,
          user_id: userId,
          role: "assistant",
          parts,
        })
      } catch {
        // silencioso — perda de log de uma mensagem não pode quebrar o chat
      }
    },
  })

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
  // Devolve o threadId pro cliente saber em qual thread está, e poder
  // adicionar à URL / sidebar sem precisar de outra request.
  if (threadId) response.headers.set("x-thread-id", threadId)
  return response
}
