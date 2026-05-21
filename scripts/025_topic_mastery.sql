-- 025_topic_mastery.sql
-- Memória acadêmica + spaced repetition (sistema Leitner).
--
-- Rastreia o domínio do aluno por (matéria, tópico) ao longo do tempo.
-- Cada par tem uma "caixa" Leitner (1-5): acertou → sobe de caixa
-- (intervalo de revisão maior); errou → volta pra caixa 1. O campo
-- next_review diz quando o tópico deve ser reativado pra revisão.
-- Idempotente.

create table if not exists public.topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  -- Caixa Leitner: 1 (acabou de errar) a 5 (dominado).
  box int not null default 1 check (box between 1 and 5),
  times_seen int not null default 0,
  times_correct int not null default 0,
  last_seen timestamptz not null default now(),
  -- Quando esse tópico deve voltar pra revisão.
  next_review timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Um registro por aluno × matéria × tópico.
  unique (user_id, subject, topic)
);

create index if not exists topic_mastery_user_due_idx
  on public.topic_mastery (user_id, next_review);

create index if not exists topic_mastery_user_subject_idx
  on public.topic_mastery (user_id, subject);

alter table public.topic_mastery enable row level security;

drop policy if exists "tm_select_own" on public.topic_mastery;
drop policy if exists "tm_insert_own" on public.topic_mastery;
drop policy if exists "tm_update_own" on public.topic_mastery;
drop policy if exists "tm_delete_own" on public.topic_mastery;
drop policy if exists "tm_select_staff" on public.topic_mastery;

create policy "tm_select_own" on public.topic_mastery
  for select using (auth.uid() = user_id);

create policy "tm_insert_own" on public.topic_mastery
  for insert with check (auth.uid() = user_id);

create policy "tm_update_own" on public.topic_mastery
  for update using (auth.uid() = user_id);

create policy "tm_delete_own" on public.topic_mastery
  for delete using (auth.uid() = user_id);

-- Staff (professor/admin) pode ler o domínio de qualquer aluno —
-- útil pra acompanhamento pedagógico.
create policy "tm_select_staff" on public.topic_mastery
  for select using (public.is_staff());
