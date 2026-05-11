-- =============================================================================
-- ATENIS — MIGRATIONS COMBINADAS (011 + 012 + 013)
-- Rode tudo de uma vez no SQL Editor do Supabase. Idempotente — pode rodar
-- várias vezes sem quebrar.
-- Link: https://supabase.com/dashboard/project/vvowrrflcldkvmhoyvmz/sql/new
-- =============================================================================


-- =============================================================================
-- PARTE 1 — 011: Info de professor (séries que leciona + sub-matérias NS)
-- =============================================================================

alter table public.profiles
  add column if not exists teaching_grades text[];

alter table public.profiles
  add column if not exists teaching_natural_sub text[];

alter table public.profiles drop constraint if exists profiles_teaching_grades_check;
alter table public.profiles
  add constraint profiles_teaching_grades_check
  check (
    teaching_grades is null
    or teaching_grades <@ array[
      '6th_grade','7th_grade','8th_grade','9th_grade',
      '10th_grade','11th_grade','12th_grade'
    ]::text[]
  );

alter table public.profiles drop constraint if exists profiles_teaching_natural_sub_check;
alter table public.profiles
  add constraint profiles_teaching_natural_sub_check
  check (
    teaching_natural_sub is null
    or teaching_natural_sub <@ array['fisica','quimica','biologia']::text[]
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role text;
  requested_grade text;
  safe_grade text;
  requested_teaching_grades text[];
  safe_teaching_grades text[];
  requested_teaching_sub text[];
  safe_teaching_sub text[];
begin
  requested_role  := nullif(new.raw_user_meta_data->>'role', '');
  requested_grade := nullif(new.raw_user_meta_data->>'grade_level', '');

  safe_role := case
    when requested_role in ('student','professor') then requested_role
    else 'student'
  end;

  safe_grade := case
    when requested_grade in ('6th_grade','7th_grade','8th_grade','9th_grade',
                             '10th_grade','11th_grade','12th_grade') then requested_grade
    else null
  end;

  if safe_role = 'professor' then
    begin
      requested_teaching_grades := array(
        select jsonb_array_elements_text(new.raw_user_meta_data->'teaching_grades')
      );
    exception when others then
      requested_teaching_grades := null;
    end;

    begin
      requested_teaching_sub := array(
        select jsonb_array_elements_text(new.raw_user_meta_data->'teaching_natural_sub')
      );
    exception when others then
      requested_teaching_sub := null;
    end;

    safe_teaching_grades := case
      when requested_teaching_grades is null then null
      else (
        select array_agg(g) from unnest(requested_teaching_grades) g
        where g in ('6th_grade','7th_grade','8th_grade','9th_grade',
                    '10th_grade','11th_grade','12th_grade')
      )
    end;

    safe_teaching_sub := case
      when requested_teaching_sub is null then null
      else (
        select array_agg(s) from unnest(requested_teaching_sub) s
        where s in ('fisica','quimica','biologia')
      )
    end;
  else
    safe_teaching_grades := null;
    safe_teaching_sub := null;
  end if;

  insert into public.profiles (id, full_name, role, grade_level, email,
                               teaching_grades, teaching_natural_sub)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role,
    safe_grade,
    new.email,
    safe_teaching_grades,
    safe_teaching_sub
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user falhou: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- PARTE 2 — 012: RPC pra staff editar dados de aluno
-- =============================================================================

create or replace function public.staff_update_student(
  p_student_id uuid,
  p_full_name text,
  p_grade_level text
)
returns table (
  id uuid,
  full_name text,
  grade_level text,
  role text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  safe_grade text;
begin
  if not public.is_staff() then
    raise exception 'access denied: staff only';
  end if;

  select p.role into target_role
  from public.profiles p
  where p.id = p_student_id;

  if target_role is null then
    raise exception 'student not found';
  end if;
  if target_role <> 'student' then
    raise exception 'target is not a student (role=%)', target_role;
  end if;

  safe_grade := case
    when p_grade_level is null or p_grade_level = '' then null
    when p_grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade',
                           '10th_grade','11th_grade','12th_grade') then p_grade_level
    else null
  end;

  update public.profiles
  set
    full_name   = coalesce(nullif(trim(p_full_name), ''), full_name),
    grade_level = safe_grade,
    updated_at  = now()
  where public.profiles.id = p_student_id;

  return query
    select p.id, p.full_name, p.grade_level, p.role, p.email
    from public.profiles p
    where p.id = p_student_id;
end;
$$;

grant execute on function public.staff_update_student(uuid, text, text) to authenticated;


-- =============================================================================
-- PARTE 3 — 013: Garante RPC list_events_for_user + reload schema cache
-- =============================================================================

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

notify pgrst, 'reload schema';

-- =============================================================================
-- FIM. Se rodou sem erro, está tudo aplicado.
-- =============================================================================
