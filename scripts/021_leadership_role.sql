-- 021: Role 'leadership' (liderança da escola).
--
-- Hierarquia:
--   super_admin > admin > leadership > professor / student
--
-- Liderança = "tipo um admin" mas:
-- - Admin pode editar/promover/rebaixar liderança
-- - Liderança NÃO pode editar admin nem outras lideranças
-- - Liderança PODE editar alunos/professores e mudar role student↔professor
-- - Liderança NÃO pode promover/rebaixar admin nem leadership
-- - Apenas super admin promove pra admin
--
-- Liderança tem um título livre (`leadership_title`) escrito pelo próprio
-- usuário no signup. Ex: "Diretora", "Coordenadora pedagógica",
-- "Mentora do 11º ano".
--
-- Restrição: signup como liderança requer email @conceptedu.com.br.
--
-- Idempotente.

-- ========== 1. Coluna leadership_title ==========
alter table public.profiles
  add column if not exists leadership_title text;

-- ========== 2. Helpers ==========
create or replace function public.is_leadership()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'leadership'
  );
$$;

grant execute on function public.is_leadership() to authenticated;

-- "admin OU liderança" — pra gestão de alunos/professores
create or replace function public.is_admin_or_leadership()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','leadership')
  );
$$;

grant execute on function public.is_admin_or_leadership() to authenticated;

-- ========== 3. apply_signup_intent — aceita 'leadership' com email check ==========
drop function if exists public.apply_signup_intent(text,text,text,text[],text[],jsonb) cascade;
drop function if exists public.apply_signup_intent(text,text,text,text[],text[],jsonb,text) cascade;

create function public.apply_signup_intent(
  p_role text,
  p_full_name text default null,
  p_grade_level text default null,
  p_teaching_grades text[] default null,
  p_teaching_natural_sub text[] default null,
  p_teaching_assignments jsonb default null,
  p_leadership_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  current_role text;
  safe_role text;
  safe_grade text;
  safe_teaching_grades text[];
  safe_teaching_sub text[];
  safe_assignments jsonb;
  safe_title text;
  derived_grades text[];
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select email into user_email from auth.users where id = uid;

  -- Sanitiza role: 'leadership' só se email for @conceptedu.com.br
  safe_role := case
    when p_role = 'leadership' and user_email like '%@conceptedu.com.br' then 'leadership'
    when p_role = 'leadership' then 'student' -- email não bate, fallback
    when p_role in ('student','professor') then p_role
    else 'student'
  end;

  safe_grade := case
    when p_grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade',
                           '10th_grade','11th_grade','12th_grade') then p_grade_level
    else null
  end;

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

  safe_title := case
    when safe_role = 'leadership' then nullif(trim(p_leadership_title), '')
    else null
  end;

  insert into public.profiles (id, full_name, role)
  values (uid, coalesce(nullif(trim(p_full_name), ''), ''), safe_role)
  on conflict (id) do nothing;

  select p.role into current_role from public.profiles p where p.id = uid;

  update public.profiles
  set
    role = case
      when current_role = 'admin' then 'admin'
      when current_role = 'leadership' and safe_role <> 'admin' then 'leadership'
      when current_role = 'professor' and safe_role not in ('admin','leadership') then 'professor'
      when safe_role = 'leadership' then 'leadership'
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
    leadership_title = case
      when safe_role = 'leadership' and safe_title is not null
        then safe_title
      else public.profiles.leadership_title
    end,
    updated_at = now()
  where public.profiles.id = uid;
end;
$$;

grant execute on function public.apply_signup_intent(text,text,text,text[],text[],jsonb,text)
  to authenticated;

-- ========== 4. staff_change_role — aceita 'leadership' + hierarquia ==========
drop function if exists public.staff_change_role(uuid, text) cascade;

create function public.staff_change_role(
  p_target_id uuid,
  p_new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_target_role text;
  caller_role text;
  is_super boolean;
  is_admin_caller boolean;
  is_leader_caller boolean;
  is_admin_involved boolean;
  is_leadership_involved boolean;
begin
  -- Caller precisa ser admin ou liderança
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role not in ('admin','leadership') then
    raise exception 'access denied: admin or leadership only';
  end if;

  is_super := public.is_super_admin();
  is_admin_caller := (caller_role = 'admin');
  is_leader_caller := (caller_role = 'leadership');

  -- Conta protegida: só super admin
  if public.is_protected_account(p_target_id) and not is_super then
    raise exception 'access denied: only super admin can edit this account';
  end if;

  if p_new_role not in ('student','professor','admin','leadership') then
    raise exception 'invalid role: %', p_new_role;
  end if;

  select role into current_target_role
  from public.profiles
  where id = p_target_id;

  if current_target_role is null then
    raise exception 'target profile not found';
  end if;

  if current_target_role = p_new_role then
    return;
  end if;

  is_admin_involved := (current_target_role = 'admin' or p_new_role = 'admin');
  is_leadership_involved := (current_target_role = 'leadership' or p_new_role = 'leadership');

  -- Só super admin envolve admin
  if is_admin_involved and not is_super then
    raise exception 'access denied: only super admin can change admin role';
  end if;

  -- Liderança não pode envolver leadership em transições (só admin pode)
  if is_leadership_involved and is_leader_caller then
    raise exception 'access denied: leadership cannot promote/demote leadership';
  end if;

  -- Ninguém rebaixa o super admin
  if p_target_id = '654ace27-861f-47c2-a918-993ef1b3f993'::uuid
     and p_new_role <> 'admin' then
    raise exception 'cannot demote the super admin';
  end if;

  update public.profiles
  set
    role = p_new_role,
    grade_level = case
      when p_new_role = 'student' then grade_level
      when p_new_role = 'professor' then null
      when p_new_role = 'leadership' then null
      else grade_level
    end,
    teaching_grades = case
      when p_new_role = 'professor' then teaching_grades
      else null
    end,
    teaching_assignments = case
      when p_new_role = 'professor' then teaching_assignments
      else '{}'::jsonb
    end,
    teaching_natural_sub = case
      when p_new_role = 'professor' then teaching_natural_sub
      else null
    end,
    leadership_title = case
      when p_new_role = 'leadership' then leadership_title
      else null
    end,
    updated_at = now()
  where id = p_target_id;
end;
$$;

grant execute on function public.staff_change_role(uuid, text) to authenticated;

-- ========== 5. list_leaders_for_admin() ==========
do $$
declare
  r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where proname = 'list_leaders_for_admin'
      and pronamespace = 'public'::regnamespace
  loop
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end;
$$;

create function public.list_leaders_for_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  leadership_title text,
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
           p.leadership_title, p.created_at
    from public.profiles p
    where p.role = 'leadership'
      and (p.hidden_from_staff is null or p.hidden_from_staff = false)
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_leaders_for_admin() to authenticated;

-- ========== 6. staff_update_leadership(p_id, p_full_name, p_title) ==========
-- Admin (não liderança) pode editar dados de liderança.
drop function if exists public.staff_update_leadership(uuid, text, text) cascade;

create function public.staff_update_leadership(
  p_leadership_id uuid,
  p_full_name text default null,
  p_leadership_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
begin
  if not public.is_admin() then
    raise exception 'access denied: admin only';
  end if;

  if public.is_protected_account(p_leadership_id) and not public.is_super_admin() then
    raise exception 'access denied: only super admin can edit this account';
  end if;

  select role into target_role from public.profiles where id = p_leadership_id;
  if target_role is null then
    raise exception 'target profile not found';
  end if;
  if target_role <> 'leadership' then
    raise exception 'target is not leadership (role=%)', target_role;
  end if;

  update public.profiles
  set
    full_name = case
      when p_full_name is not null and trim(p_full_name) <> ''
        then trim(p_full_name)
      else full_name
    end,
    leadership_title = case
      when p_leadership_title is not null
        then nullif(trim(p_leadership_title), '')
      else leadership_title
    end,
    updated_at = now()
  where id = p_leadership_id;
end;
$$;

grant execute on function public.staff_update_leadership(uuid, text, text) to authenticated;

-- ========== 7. staff_update_student — agora aceita liderança como caller ==========
drop function if exists public.staff_update_student(uuid, text, text) cascade;

create function public.staff_update_student(
  p_student_id uuid,
  p_full_name text default null,
  p_grade_level text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  safe_grade text;
begin
  -- Caller: admin, leadership ou professor
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','leadership','professor')
  ) then
    raise exception 'access denied: staff only';
  end if;

  if public.is_protected_account(p_student_id) and not public.is_super_admin() then
    raise exception 'access denied: only super admin can edit this account';
  end if;

  select role into target_role from public.profiles where id = p_student_id;
  if target_role is null then
    raise exception 'target profile not found';
  end if;
  if target_role <> 'student' then
    raise exception 'target is not a student (role=%)', target_role;
  end if;

  safe_grade := case
    when p_grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade',
                           '10th_grade','11th_grade','12th_grade') then p_grade_level
    when p_grade_level is null then null
    else null
  end;

  update public.profiles
  set
    full_name = case
      when p_full_name is not null and trim(p_full_name) <> ''
        then trim(p_full_name)
      else full_name
    end,
    grade_level = safe_grade,
    updated_at = now()
  where id = p_student_id;
end;
$$;

grant execute on function public.staff_update_student(uuid, text, text) to authenticated;

-- ========== 8. staff_update_professor — agora aceita liderança como caller ==========
drop function if exists public.staff_update_professor(uuid, text, text[], text[], jsonb) cascade;

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
  -- Caller: admin ou leadership
  if not public.is_admin_or_leadership() then
    raise exception 'access denied: admin or leadership only';
  end if;

  if public.is_protected_account(p_professor_id) and not public.is_super_admin() then
    raise exception 'access denied: only super admin can edit this account';
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

grant execute on function public.staff_update_professor(uuid, text, text[], text[], jsonb) to authenticated;

-- ========== 9. list_professors_for_admin — agora visível pra liderança ==========
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
  if not public.is_admin_or_leadership() then
    raise exception 'access denied: admin or leadership only';
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

notify pgrst, 'reload schema';
