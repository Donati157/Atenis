-- 013: Garante que a RPC list_events_for_user existe e recarrega o schema
-- cache do PostgREST. Execute se aparecer:
--   "Could not find the function public.list_events_for_user ... in the schema cache"
-- Idempotente.

-- ========== 1. Pré-requisitos ==========
-- Cria a tabela learning_events caso ainda não exista (sem reset).
create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'chat_message','exercise_answer','correction_essay','simulate_attempt'
  )),
  subject text,
  topic text,
  correct boolean,
  score numeric,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists learning_events_user_created_idx
  on public.learning_events (user_id, created_at desc);

alter table public.learning_events enable row level security;

drop policy if exists "le_select_own"   on public.learning_events;
drop policy if exists "le_insert_own"   on public.learning_events;
drop policy if exists "le_select_staff" on public.learning_events;

create policy "le_select_own" on public.learning_events
  for select using (auth.uid() = user_id);

create policy "le_insert_own" on public.learning_events
  for insert with check (auth.uid() = user_id);

create policy "le_select_staff" on public.learning_events
  for select using (public.is_staff());

-- ========== 2. Remove versões antigas (qualquer assinatura) ==========
-- Se existir com tipo errado, o create or replace abaixo poderia falhar.
do $$
declare
  r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where proname = 'list_events_for_user'
      and pronamespace = 'public'::regnamespace
  loop
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end;
$$;

-- ========== 3. Cria a função na assinatura que o app usa ==========
create function public.list_events_for_user(
  target_user_id uuid,
  limit_rows int default 200
)
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
    select e.id, e.user_id, e.kind, e.subject, e.topic,
           e.correct, e.score, e.metadata, e.created_at
    from public.learning_events e
    where e.user_id = target_user_id
    order by e.created_at desc
    limit greatest(limit_rows, 1);
end;
$$;

grant execute on function public.list_events_for_user(uuid, int) to authenticated;

-- ========== 4. Recarrega o schema cache do PostgREST ==========
-- Força o Supabase a enxergar a função recém criada imediatamente,
-- sem esperar o refresh automático (que pode demorar).
notify pgrst, 'reload schema';
