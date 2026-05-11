-- 020: Contas protegidas — só o super admin (admin principal) pode editar.
--
-- Diferente da matriz de role: aqui o alvo é IDENTIFICADO POR UUID. Mesmo um
-- admin comum (que normalmente pode editar professores/alunos) é bloqueado
-- de mexer nessas contas. Útil pra contas-chave (parceiros, fundadores, etc.)
-- que não devem ser tocadas exceto pelo super admin.
--
-- Lista atual: 61bc2ee4-b071-4c76-a9e7-1eb5b090d408
--
-- Espelhado em lib/super-admin.ts (PROTECTED_ACCOUNT_IDS).
-- Se mudar aqui, mudar lá também.
--
-- Idempotente. Reaplica os RPCs com o novo check.

-- ========== 1. is_protected_account(uuid) ==========
create or replace function public.is_protected_account(p_id uuid)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_id = '61bc2ee4-b071-4c76-a9e7-1eb5b090d408'::uuid;
$$;

grant execute on function public.is_protected_account(uuid) to authenticated;

-- ========== 2. staff_update_student — bloqueia conta protegida pra não-super ==========
-- Re-cria mantendo a assinatura existente (3 params).
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
  -- Caller precisa ser staff (admin OU professor)
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','professor')
  ) then
    raise exception 'access denied: staff only';
  end if;

  -- Conta protegida: só super admin
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
    else null  -- valor inválido vira null
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

-- ========== 3. staff_update_professor — adiciona check de protected ==========
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
  if not public.is_admin() then
    raise exception 'access denied: admin only';
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

-- ========== 4. staff_update_admin_name — adiciona check de protected ==========
drop function if exists public.staff_update_admin_name(uuid, text) cascade;

create function public.staff_update_admin_name(
  p_admin_id uuid,
  p_full_name text
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

  if public.is_protected_account(p_admin_id) and not public.is_super_admin() then
    raise exception 'access denied: only super admin can edit this account';
  end if;

  if p_full_name is null or trim(p_full_name) = '' then
    raise exception 'full_name cannot be empty';
  end if;

  select role into target_role from public.profiles where id = p_admin_id;
  if target_role is null then
    raise exception 'target profile not found';
  end if;
  if target_role <> 'admin' then
    raise exception 'target is not an admin (role=%)', target_role;
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      updated_at = now()
  where id = p_admin_id;
end;
$$;

grant execute on function public.staff_update_admin_name(uuid, text) to authenticated;

-- ========== 5. staff_change_role — adiciona check de protected ==========
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
  is_super boolean;
  is_regular_admin boolean;
  is_admin_involved boolean;
begin
  if not public.is_admin() then
    raise exception 'access denied: admin only';
  end if;

  is_super := public.is_super_admin();
  is_regular_admin := not is_super;

  -- Conta protegida: só super admin
  if public.is_protected_account(p_target_id) and not is_super then
    raise exception 'access denied: only super admin can edit this account';
  end if;

  if p_new_role not in ('student','professor','admin') then
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

  if is_regular_admin and is_admin_involved then
    raise exception 'access denied: only super admin can change admin role';
  end if;

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
      else grade_level
    end,
    teaching_grades = case
      when p_new_role = 'professor' then teaching_grades
      when p_new_role = 'student' then null
      else teaching_grades
    end,
    teaching_assignments = case
      when p_new_role = 'professor' then teaching_assignments
      when p_new_role = 'student' then '{}'::jsonb
      else teaching_assignments
    end,
    teaching_natural_sub = case
      when p_new_role = 'professor' then teaching_natural_sub
      when p_new_role = 'student' then null
      else teaching_natural_sub
    end,
    updated_at = now()
  where id = p_target_id;
end;
$$;

grant execute on function public.staff_change_role(uuid, text) to authenticated;

notify pgrst, 'reload schema';
