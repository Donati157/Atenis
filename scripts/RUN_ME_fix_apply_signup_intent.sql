-- HOTFIX: corrige `column reference "id" is ambiguous` na função
-- apply_signup_intent. Causado por RETURNS TABLE com nomes que colidem com
-- colunas da tabela profiles. Solução: trocar pra RETURNS void.
-- Idempotente. Rode esta SQL no SQL Editor depois de RUN_ME_combined_014_015_016.sql.

-- Dropa qualquer versão existente (independente da assinatura) — necessário
-- porque PostgreSQL não deixa CREATE OR REPLACE mudar o return type.
do $$
declare
  r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where proname = 'apply_signup_intent'
      and pronamespace = 'public'::regnamespace
  loop
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end;
$$;

create function public.apply_signup_intent(
  p_role text,
  p_full_name text default null,
  p_grade_level text default null,
  p_teaching_grades text[] default null,
  p_teaching_natural_sub text[] default null
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
    updated_at = now()
  where public.profiles.id = uid;
end;
$$;

grant execute on function public.apply_signup_intent(text, text, text, text[], text[])
  to authenticated;

notify pgrst, 'reload schema';
