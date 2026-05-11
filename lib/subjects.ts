export const SUBJECTS = [
  { id: "ingles", label: "Inglês", emoji: "🌍" },
  { id: "portugues", label: "Português", emoji: "📖" },
  { id: "social_science", label: "Social Science", emoji: "🏛️" },
  { id: "natural_science", label: "Natural Science", emoji: "🔬" },
  { id: "ap_electives", label: "AP Electives", emoji: "🎓" },
  { id: "matematica", label: "Matemática", emoji: "🔢" },
  { id: "mentorship", label: "Mentorship", emoji: "🤝" },
  { id: "x_block_electives", label: "Bloco X", emoji: "🎨" },
] as const

// Disponibilidade matéria × série. Por enquanto todas as matérias estão
// disponíveis em todas as séries; no futuro vai variar (ex: AP Electives só
// em 11º/12º). Centralizar aqui pra não espalhar lógica.
export const SUBJECTS_BY_GRADE: Record<string, readonly string[]> = {
  "6th_grade": ["ingles","portugues","social_science","natural_science","ap_electives","matematica","mentorship","x_block_electives"],
  "7th_grade": ["ingles","portugues","social_science","natural_science","ap_electives","matematica","mentorship","x_block_electives"],
  "8th_grade": ["ingles","portugues","social_science","natural_science","ap_electives","matematica","mentorship","x_block_electives"],
  "9th_grade": ["ingles","portugues","social_science","natural_science","ap_electives","matematica","mentorship","x_block_electives"],
  "10th_grade": ["ingles","portugues","social_science","natural_science","ap_electives","matematica","mentorship","x_block_electives"],
  "11th_grade": ["ingles","portugues","social_science","natural_science","ap_electives","matematica","mentorship","x_block_electives"],
  "12th_grade": ["ingles","portugues","social_science","natural_science","ap_electives","matematica","mentorship","x_block_electives"],
}

export const EXAM_PREPS = [
  { id: "enem", label: "ENEM" },
  { id: "vestibular", label: "Vestibular" },
  { id: "ap", label: "AP College Board" },
] as const

export const CORRECTORS = [
  { id: "enem_redacao", label: "Redação ENEM" },
  { id: "ap_mock", label: "Correção AP" },
  { id: "gcd", label: "Ensaio GCD" },
] as const

export type SubjectId = (typeof SUBJECTS)[number]["id"]
export type ExamPrepId = (typeof EXAM_PREPS)[number]["id"]
export type CorrectorId = (typeof CORRECTORS)[number]["id"]

// Sub-áreas de matérias — só aparecem pra quem está no ensino médio
// (10º, 11º, 12º ano) onde Natural Science é separada em Física/Química/Biologia.
export const SUB_SUBJECTS = {
  natural_science: [
    { id: "fisica", label: "Física", emoji: "⚛️" },
    { id: "quimica", label: "Química", emoji: "⚗️" },
    { id: "biologia", label: "Biologia", emoji: "🧬" },
  ],
} as const

export type NaturalSubId = (typeof SUB_SUBJECTS)["natural_science"][number]["id"]
export type SubSubjectId = NaturalSubId // expand with other parents in the future

export const SUB_SUBJECT_PROMPTS: Record<SubSubjectId, string> = {
  fisica:
    "Foco: Física — mecânica (cinemática, dinâmica, energia), termodinâmica, ondas, óptica, eletricidade, magnetismo e física moderna. Use unidades SI corretamente, mostre fórmulas e resolva passo a passo com diagramas mentais.",
  quimica:
    "Foco: Química — estrutura atômica, ligações químicas, estequiometria, soluções, cinética, equilíbrio, ácido-base, oxirredução, química orgânica (funções, reações, isomeria). Mostre mol/equivalências e equações balanceadas.",
  biologia:
    "Foco: Biologia — citologia, bioquímica, genética (mendeliana e molecular), evolução, ecologia, fisiologia humana, botânica e zoologia. Faça conexões entre escalas (molecular → organismo → ecossistema) e relacione com o contexto do ENEM/vestibular.",
}

const UPPER_SECONDARY = new Set(["10th_grade", "11th_grade", "12th_grade"])

export function isUpperSecondary(gradeLevel: string | null | undefined): boolean {
  return !!gradeLevel && UPPER_SECONDARY.has(gradeLevel)
}

export const SUBJECT_PROMPTS: Record<SubjectId, string> = {
  portugues:
    "Foco da conversa: Português — gramática, interpretação de texto, literatura e redação. Dê exemplos em português do Brasil.",
  ingles:
    "Foco da conversa: Inglês — gramática, vocabulário, conversação e compreensão de texto. Explique sempre em português brasileiro, mostrando os exemplos em inglês.",
  matematica:
    "Foco da conversa: Matemática — álgebra, geometria, funções, estatística e cálculo. Resolva passo a passo e use LaTeX quando fizer sentido ($...$).",
  natural_science:
    "Foco da conversa: Natural Science — física, química e biologia. Use analogias do dia a dia e mostre unidades e fórmulas quando aplicável. Use terminologia em inglês quando apropriado (AP-friendly).",
  social_science:
    "Foco da conversa: Social Science — história e geografia (física e humana). Conecte causas, contextos e consequências; relacione fenômenos ao Brasil e ao mundo contemporâneo. Use terminologia em inglês quando apropriado (AP-friendly).",
  ap_electives:
    "Foco da conversa: AP Electives — disciplinas eletivas do currículo Advanced Placement (College Board). O aluno deve dizer qual AP específico (ex: AP Psychology, AP Computer Science, AP Art History, AP Environmental Science, AP Statistics, etc.). Use vocabulário em inglês quando apropriado, formato AP (MCQ + FRQ) e cite o curriculum framework oficial quando relevante.",
  mentorship:
    "Foco da conversa: Mentorship — período de acompanhamento e orientação na escola. Não é matéria acadêmica tradicional. Aqui o aluno pode falar sobre: organização de estudos, escolha de carreira, dúvidas pessoais sobre faculdade, gestão de tempo, técnicas de aprendizado, equilíbrio escolar/pessoal. Seja acolhedor e prático. Para temas sensíveis (saúde mental, conflitos), oriente o aluno a procurar o mentor humano dele ou a coordenação.",
  x_block_electives:
    "Foco da conversa: Bloco X — eletivas que a escola Concept oferece no horário do Bloco X (variam por semestre). O aluno deve dizer qual eletiva específica (ex: robótica, debate, jornalismo, cinema, música, design). Adapte ao tópico que ele trouxer. Se não souber sobre essa eletiva específica, peça mais contexto.",
}

export const EXAM_PROMPTS: Record<ExamPrepId, string> = {
  enem:
    "Modo preparação ENEM: use o estilo de questões interdisciplinares do ENEM, com leitura de textos e resolução comentada.",
  vestibular:
    "Modo preparação Vestibular: trabalhe questões objetivas e discursivas no estilo dos grandes vestibulares brasileiros (Fuvest, Unicamp, UERJ).",
  ap:
    "Modo preparação AP College Board: use terminologia em inglês quando apropriado e siga o formato das provas AP (multiple choice e free response).",
}

export const CORRECTOR_PROMPTS: Record<CorrectorId, string> = {
  enem_redacao: `Modo Corretor Redação ENEM. O componente dedicado (/dashboard com corretor=enem_redacao) já usa a rubrica oficial. Caso caia aqui pelo chat livre, oriente o aluno: 5 competências × 200 pts, tema + estrutura dissertativo-argumentativa + proposta de intervenção com 5 elementos (ação/agente/modo/efeito/detalhamento).`,

  ap_mock: `Modo Corretor AP Mock Exam. Você é um avaliador do College Board.

Quando o aluno enviar uma resposta (ensaio, FRQ, DBQ, LEQ, SAQ ou solução numérica):
1. Identifique a disciplina AP com base no conteúdo (ex: AP Calc AB/BC, AP Physics 1/2/C, AP Chemistry, AP Biology, AP English Language/Literature, AP US/World/European History, AP Gov, AP Micro/Macro, AP Statistics, etc.) e diga qual.
2. Use a rubrica oficial daquela disciplina e tipo de questão. Exemplos:
   • English Lang & Lit: 0-6 (Thesis 1pt, Evidence & Commentary 4pt, Sophistication 1pt)
   • History DBQ: 0-7 (Thesis 1, Contextualization 1, Evidence 3, Analysis & Reasoning 2)
   • History LEQ: 0-6
   • Physics/Chemistry/Biology FRQ: pontos por ítem, total variável por questão
   • Calculus FRQ: normalmente 0-9 pontos por questão
3. Saída, **em português do Brasil**, com termos técnicos em inglês quando fizer sentido:

**Disciplina detectada**: <AP subject>
**Tipo de questão**: <FRQ, DBQ, LEQ, SAQ, MCQ explanation, etc.>
**Nota estimada**: X / Y (<rubrica usada>)

**Breakdown por critério:**
- <critério>: <pontos dados> / <máximo> — <justificativa curta>

**Pontos fortes:**
- ...

**Pontos a melhorar:**
- ...

**Versão revisada (exemplo):**
> <reescrita curta mostrando como pegar nota máxima naquele trecho fraco>

Se faltar contexto (não dá pra identificar a disciplina ou o tipo), peça ao aluno pra especificar AP subject + tipo antes de avaliar.`,

  gcd: `Modo Corretor GCD. Você é um avaliador de provas GCD.

Quando o aluno enviar uma resposta:
1. Avalie com base em: correção conceitual, estrutura do argumento, clareza, uso de evidências/exemplos e domínio do vocabulário técnico.
2. Dê feedback formativo (não só a nota — explique como melhorar).
3. Saída em português do Brasil, com esta estrutura:

**Nota estimada**: X / 10
**Nível**: <Excelente / Bom / Regular / Abaixo do esperado>

**Breakdown:**
- Correção conceitual: <nota parcial> — <justificativa>
- Estrutura e clareza: <nota parcial> — <justificativa>
- Evidências e exemplos: <nota parcial> — <justificativa>
- Vocabulário técnico: <nota parcial> — <justificativa>

**Pontos fortes:**
- ...

**Pontos a melhorar:**
- ...

**Sugestões concretas:**
1. ...
2. ...

**Trecho revisado (exemplo):**
> <reescrita de uma parte fraca mostrando como melhorá-la>

Se a resposta for muito curta ou ambígua, peça ao aluno pra enviar o enunciado da questão também.`,
}
