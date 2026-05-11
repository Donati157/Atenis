-- Fase B: Learning Analytics + Trilha de Estudos.
-- Cria duas tabelas novas (learning_events, study_plans) e as RLS
-- necessárias. Idempotente.

-- ========== 1. learning_events ==========
-- Registra TODA interação relevante do aluno pra depois gerar insights.
create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'chat_message',       -- mensagem enviada no chat livre
    'exercise_answer',    -- tentativa de exercício (certo ou errado)
    'correction_essay',   -- correção enviada (ENEM/GCD/AP)
    'simulate_attempt'    -- tentativa em simulado
  )),
  subject text,            -- p.ex. "portugues", "matematica", "history-dbq"
  topic text,              -- p.ex. "crase", "figuras-de-linguagem", "DBQ-thesis"
  correct boolean,         -- null quando não é avaliável (chat livre)
  score numeric,           -- pontuação normalizada 0-1 ou 0-100 quando aplicável
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists learning_events_user_created_idx
  on public.learning_events (user_id, created_at desc);

create index if not exists learning_events_user_subject_idx
  on public.learning_events (user_id, subject);

alter table public.learning_events enable row level security;

-- Policies
drop policy if exists "le_select_own"  on public.learning_events;
drop policy if exists "le_insert_own"  on public.learning_events;
drop policy if exists "le_select_staff" on public.learning_events;

create policy "le_select_own" on public.learning_events
  for select using (auth.uid() = user_id);

create policy "le_insert_own" on public.learning_events
  for insert with check (auth.uid() = user_id);

create policy "le_select_staff" on public.learning_events
  for select using (public.is_staff());

-- ========== 2. study_plans ==========
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal text,                   -- "ENEM 2026", "AP World History"
  days jsonb not null,         -- array com estrutura: [{ day: 1, topic, subject, tasks: [...] }]
  current_day int default 1,
  status text default 'active' check (status in ('active','paused','completed','abandoned')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists study_plans_user_idx
  on public.study_plans (user_id, status);

alter table public.study_plans enable row level security;

drop policy if exists "sp_select_own"   on public.study_plans;
drop policy if exists "sp_insert_own"   on public.study_plans;
drop policy if exists "sp_update_own"   on public.study_plans;
drop policy if exists "sp_delete_own"   on public.study_plans;
drop policy if exists "sp_select_staff" on public.study_plans;
drop policy if exists "sp_insert_staff" on public.study_plans;
drop policy if exists "sp_update_staff" on public.study_plans;

create policy "sp_select_own" on public.study_plans
  for select using (auth.uid() = user_id);

create policy "sp_insert_own" on public.study_plans
  for insert with check (auth.uid() = user_id);

create policy "sp_update_own" on public.study_plans
  for update using (auth.uid() = user_id);

create policy "sp_delete_own" on public.study_plans
  for delete using (auth.uid() = user_id);

-- Staff (professor/admin) consegue ler e escrever planos de qualquer aluno,
-- útil pra professores montarem trilhas.
create policy "sp_select_staff" on public.study_plans
  for select using (public.is_staff());

create policy "sp_insert_staff" on public.study_plans
  for insert with check (public.is_staff());

create policy "sp_update_staff" on public.study_plans
  for update using (public.is_staff());

-- ========== 3. RPC para staff consultar eventos de qualquer aluno ==========
create or replace function public.list_events_for_user(target_user_id uuid, limit_rows int default 200)
returns table (
  id uuid,
  user_id uuid,
  kind text,
  subject text,
  topic text,
  correct boolean,
  score numeric,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() <> target_user_id and not public.is_staff() then
    raise exception 'access denied';
  end if;

  return query
    select e.id, e.user_id, e.kind, e.subject, e.topic, e.correct, e.score, e.metadata, e.created_at
    from public.learning_events e
    where e.user_id = target_user_id
    order by e.created_at desc
    limit greatest(limit_rows, 1);
end;
$$;

grant execute on function public.list_events_for_user(uuid, int) to authenticated;
