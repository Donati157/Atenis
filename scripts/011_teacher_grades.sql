-- 011: Info de professor — quais séries ele leciona e (se inclui 10-12)
-- quais sub-matérias de Natural Science (Física, Química, Biologia).
-- Seguro de rodar múltiplas vezes.

-- ========== 1. Colunas em profiles ==========
alter table public.profiles
  add column if not exists teaching_grades text[];

alter table public.profiles
  add column if not exists teaching_natural_sub text[];

-- ========== 2. Constraints de domínio ==========
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

-- ========== 3. Atualiza o trigger pra popular esses campos no signup ==========
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

  -- 'admin' NUNCA vem do cliente.
  safe_role := case
    when requested_role in ('student','professor') then requested_role
    else 'student'
  end;

  safe_grade := case
    when requested_grade in ('6th_grade','7th_grade','8th_grade','9th_grade',
                             '10th_grade','11th_grade','12th_grade') then requested_grade
    else null
  end;

  -- Arrays vindos do client (JSON array). Só faz sentido pra professor.
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

-- Trigger já existe (recria por segurança).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
