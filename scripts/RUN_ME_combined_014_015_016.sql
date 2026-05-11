-- ============================================================================
-- ATENIS — MIGRATIONS COMBINADAS 014 + 015 + 016
-- - 014: apply_signup_intent (aplica role/série após login Google)
-- - 015: is_admin + list_professors_for_admin + staff_update_professor
-- - 016: garante coluna hidden_from_staff e filtra nas listagens
-- Idempotente. Rode tudo junto.
-- Link: https://supabase.com/dashboard/project/vvowrrflcldkvmhoyvmz/sql/new
-- ============================================================================


-- =============================================================================
-- 014: apply_signup_intent
-- =============================================================================

create or replace function public.apply_signup_intent(
  p_role text,
  p_full_name text default null,
  p_grade_level text default null,
  p_teaching_grades text[] default null,
  p_teaching_natural_sub text[] default null
)
returns table (
  id uuid,
  role text,
  full_name text,
  grade_level text,
  teaching_grades text[],
  teaching_natural_sub text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_role text;
  safe_role text;
  safe_grade text;
  safe_teaching_grades text[];
  safe_teaching_sub text[];
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  safe_role := case
    when p_role in ('student','professor') then p_role
    else 'student'
  end;

  safe_grade := case
    when p_grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade',
                           '10th_grade','11th_grade','12th_grade') then p_grade_level
    else null
  end;

  safe_teaching_grades := case
    when p_teaching_grades is null then null
    else (
      select array_agg(g) from unnest(p_teaching_grades) g
      where g in ('6th_grade','7th_grade','8th_grade','9th_grade',
                  '10th_grade','11th_grade','12th_grade')
    )
  end;

  safe_teaching_sub := case
    when p_teaching_natural_sub is null then null
    else (
      select array_agg(s) from unnest(p_teaching_natural_sub) s
      where s in ('fisica','quimica','biologia')
    )
  end;

  insert into public.profiles (id, full_name, role)
  values (
    uid,
    coalesce(nullif(trim(p_full_name), ''), ''),
    safe_role
  )
  on conflict (id) do nothing;

  select p.role into current_role from public.profiles p where p.id = uid;

  update public.profiles p
  set
    role = case
      when current_role = 'admin' then 'admin'
      when current_role = 'professor' then 'professor'
      when safe_role = 'professor' then 'professor'
      else 'student'
    end,
    full_name = case
      when (p.full_name is null or p.full_name = '') and p_full_name is not null
        then nullif(trim(p_full_name), '')
      else p.full_name
    end,
    grade_level = case
      when safe_role = 'student' and safe_grade is not null then safe_grade
      else p.grade_level
    end,
    teaching_grades = case
      when safe_role = 'professor' and safe_teaching_grades is not null
        then safe_teaching_grades
      else p.teaching_grades
    end,
    teaching_natural_sub = case
      when safe_role = 'professor' and safe_teaching_sub is not null
        then safe_teaching_sub
      else p.teaching_natural_sub
    end,
    updated_at = now()
  where p.id = uid;

  return query
    select p.id, p.role, p.full_name, p.grade_level,
           p.teaching_grades, p.teaching_natural_sub
    from public.profiles p
    where p.id = uid;
end;
$$;

grant execute on function public.apply_signup_intent(text, text, text, text[], text[])
  to authenticated;


-- =============================================================================
-- 015: is_admin + Gestão de Professores
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.staff_update_professor(
  p_professor_id uuid,
  p_full_name text default null,
  p_teaching_grades text[] default null,
  p_teaching_natural_sub text[] default null
)
returns table (
  id uuid,
  full_name text,
  role text,
  email text,
  teaching_grades text[],
  teaching_natural_sub text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  safe_teaching_grades text[];
  safe_teaching_sub text[];
begin
  if not public.is_admin() then
    raise exception 'access denied: admin only';
  end if;

  select p.role into target_role
  from public.profiles p
  where p.id = p_professor_id;

  if target_role is null then
    raise exception 'professor not found';
  end if;
  if target_role <> 'professor' then
    raise exception 'target is not a professor (role=%)', target_role;
  end if;

  safe_teaching_grades := case
    when p_teaching_grades is null then null
    else (
      select array_agg(g) from unnest(p_teaching_grades) g
      where g in ('6th_grade','7th_grade','8th_grade','9th_grade',
                  '10th_grade','11th_grade','12th_grade')
    )
  end;

  safe_teaching_sub := case
    when p_teaching_natural_sub is null then null
    else (
      select array_agg(s) from unnest(p_teaching_natural_sub) s
      where s in ('fisica','quimica','biologia')
    )
  end;

  update public.profiles
  set
    full_name = case
      when p_full_name is not null and trim(p_full_name) <> ''
        then trim(p_full_name)
      else full_name
    end,
    teaching_grades = case
      when p_teaching_grades is not null then safe_teaching_grades
      else teaching_grades
    end,
    teaching_natural_sub = case
      when p_teaching_natural_sub is not null then safe_teaching_sub
      else teaching_natural_sub
    end,
    updated_at = now()
  where public.profiles.id = p_professor_id;

  return query
    select p.id, p.full_name, p.role, p.email,
           p.teaching_grades, p.teaching_natural_sub
    from public.profiles p
    where p.id = p_professor_id;
end;
$$;

grant execute on function public.staff_update_professor(uuid, text, text[], text[])
  to authenticated;


-- =============================================================================
-- 016: hidden_from_staff filtra alunos E professores nas listagens
-- =============================================================================

alter table public.profiles
  add column if not exists hidden_from_staff boolean default false;

revoke update (hidden_from_staff) on public.profiles from authenticated;
revoke update (hidden_from_staff) on public.profiles from anon;

-- list_students_for_staff (já existia, recriamos garantindo o filtro hidden)
create or replace function public.list_students_for_staff()
returns table (
  id uuid,
  full_name text,
  grade_level text,
  role text,
  email text,
  created_at timestamptz,
  hidden_from_staff boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_staff() then
    raise exception 'access denied: staff only';
  end if;

  return query
    select p.id, p.full_name, p.grade_level, p.role, p.email,
           p.created_at, p.hidden_from_staff
    from public.profiles p
    where p.role = 'student'
      and (p.hidden_from_staff is null or p.hidden_from_staff = false)
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_students_for_staff() to authenticated;

-- list_professors_for_admin (com filtro hidden)
do $$
declare
  r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where proname = 'list_professors_for_admin'
      and pronamespace = 'public'::regnamespace
  loop
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end;
$$;

create function public.list_professors_for_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  teaching_grades text[],
  teaching_natural_sub text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'access denied: admin only';
  end if;

  return query
    select p.id, p.full_name, p.email, p.role,
           p.teaching_grades, p.teaching_natural_sub, p.created_at
    from public.profiles p
    where p.role = 'professor'
      and (p.hidden_from_staff is null or p.hidden_from_staff = false)
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_professors_for_admin() to authenticated;

notify pgrst, 'reload schema';

-- =============================================================================
-- FIM. Sucesso = "Success. No rows returned" no editor.
-- =============================================================================
