-- 018: Per-grade subject assignments para professores.
-- teaching_assignments é JSONB no formato:
--   {"6th_grade": ["matematica","ingles"], "7th_grade": [], ...}
-- Cada chave é uma série, valor é array de subject ids que o professor leciona naquela série.
-- Idempotente.

-- ========== 1. Coluna teaching_assignments ==========
alter table public.profiles
  add column if not exists teaching_assignments jsonb default '{}'::jsonb;

-- ========== 2. apply_signup_intent: aceita teaching_assignments ==========
drop function if exists public.apply_signup_intent(text,text,text,text[],text[]) cascade;
drop function if exists public.apply_signup_intent(text,text,text,text[],text[],jsonb) cascade;

create function public.apply_signup_intent(
  p_role text,
  p_full_name text default null,
  p_grade_level text default null,
  p_teaching_grades text[] default null,
  p_teaching_natural_sub text[] default null,
  p_teaching_assignments jsonb default null
)
returns void
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
  safe_assignments jsonb;
  derived_grades text[];
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

  -- Se veio teaching_assignments, deriva teaching_grades das chaves com array não-vazio
  if p_teaching_assignments is not null and jsonb_typeof(p_teaching_assignments) = 'object' then
    safe_assignments := p_teaching_assignments;

    select array_agg(g order by g) into derived_grades
    from jsonb_each(p_teaching_assignments) as kv(g, subjects)
    where g in ('6th_grade','7th_grade','8th_grade','9th_grade',
                '10th_grade','11th_grade','12th_grade')
      and jsonb_typeof(subjects) = 'array'
      and jsonb_array_length(subjects) > 0;

    safe_teaching_grades := derived_grades;
  else
    safe_assignments := null;
    safe_teaching_grades := case
      when p_teaching_grades is null then null
      else (
        select array_agg(g) from unnest(p_teaching_grades) g
        where g in ('6th_grade','7th_grade','8th_grade','9th_grade',
                    '10th_grade','11th_grade','12th_grade')
      )
    end;
  end if;

  safe_teaching_sub := case
    when p_teaching_natural_sub is null then null
    else (
      select array_agg(s) from unnest(p_teaching_natural_sub) s
      where s in ('fisica','quimica','biologia')
    )
  end;

  insert into public.profiles (id, full_name, role)
  values (uid, coalesce(nullif(trim(p_full_name), ''), ''), safe_role)
  on conflict (id) do nothing;

  select p.role into current_role from public.profiles p where p.id = uid;

  update public.profiles
  set
    role = case
      when current_role = 'admin' then 'admin'
      when current_role = 'professor' then 'professor'
      when safe_role = 'professor' then 'professor'
      else 'student'
    end,
    full_name = case
      when (public.profiles.full_name is null or public.profiles.full_name = '')
        and p_full_name is not null
        then nullif(trim(p_full_name), '')
      else public.profiles.full_name
    end,
    grade_level = case
      when safe_role = 'student' and safe_grade is not null then safe_grade
      else public.profiles.grade_level
    end,
    teaching_grades = case
      when safe_role = 'professor' and safe_teaching_grades is not null
        then safe_teaching_grades
      else public.profiles.teaching_grades
    end,
    teaching_natural_sub = case
      when safe_role = 'professor' and safe_teaching_sub is not null
        then safe_teaching_sub
      else public.profiles.teaching_natural_sub
    end,
    teaching_assignments = case
      when safe_role = 'professor' and safe_assignments is not null
        then safe_assignments
      else public.profiles.teaching_assignments
    end,
    updated_at = now()
  where public.profiles.id = uid;
end;
$$;

grant execute on function public.apply_signup_intent(text,text,text,text[],text[],jsonb)
  to authenticated;

-- ========== 3. list_professors_for_admin retorna teaching_assignments também ==========
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
  teaching_assignments jsonb,
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
           p.teaching_grades, p.teaching_natural_sub, p.teaching_assignments,
           p.created_at
    from public.profiles p
    where p.role = 'professor'
      and (p.hidden_from_staff is null or p.hidden_from_staff = false)
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_professors_for_admin() to authenticated;

-- ========== 4. staff_update_professor aceita teaching_assignments ==========
drop function if exists public.staff_update_professor(uuid,text,text[],text[]) cascade;
drop function if exists public.staff_update_professor(uuid,text,text[],text[],jsonb) cascade;

create function public.staff_update_professor(
  p_professor_id uuid,
  p_full_name text default null,
  p_teaching_grades text[] default null,
  p_teaching_natural_sub text[] default null,
  p_teaching_assignments jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  safe_teaching_grades text[];
  safe_teaching_sub text[];
  derived_grades text[];
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

  if p_teaching_assignments is not null and jsonb_typeof(p_teaching_assignments) = 'object' then
    select array_agg(g order by g) into derived_grades
    from jsonb_each(p_teaching_assignments) as kv(g, subjects)
    where g in ('6th_grade','7th_grade','8th_grade','9th_grade',
                '10th_grade','11th_grade','12th_grade')
      and jsonb_typeof(subjects) = 'array'
      and jsonb_array_length(subjects) > 0;

    safe_teaching_grades := derived_grades;
  else
    safe_teaching_grades := case
      when p_teaching_grades is null then null
      else (
        select array_agg(g) from unnest(p_teaching_grades) g
        where g in ('6th_grade','7th_grade','8th_grade','9th_grade',
                    '10th_grade','11th_grade','12th_grade')
      )
    end;
  end if;

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
      when safe_teaching_grades is not null then safe_teaching_grades
      else teaching_grades
    end,
    teaching_natural_sub = case
      when p_teaching_natural_sub is not null then safe_teaching_sub
      else teaching_natural_sub
    end,
    teaching_assignments = case
      when p_teaching_assignments is not null then p_teaching_assignments
      else teaching_assignments
    end,
    updated_at = now()
  where public.profiles.id = p_professor_id;
end;
$$;

grant execute on function public.staff_update_professor(uuid,text,text[],text[],jsonb)
  to authenticated;

notify pgrst, 'reload schema';
