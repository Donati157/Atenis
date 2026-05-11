-- 015: Gestão de Professores (só admin).
-- - list_professors_for_admin() — lista todos os perfis com role='professor'
-- - staff_update_professor() — admin pode editar nome/séries/sub-matérias
-- Idempotente.

-- ========== 1. is_admin() helper (igual is_staff() mas só admin) ==========
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

-- ========== 2. Listagem de professores (só admin) ==========
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
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_professors_for_admin() to authenticated;

-- ========== 3. Edição de professor (só admin) ==========
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

  -- Filtra arrays
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

notify pgrst, 'reload schema';
