-- Migration consolidada e idempotente. Roda em qualquer estado do DB e
-- deixa o schema consistente com o frontend atual.
-- Também tranca o campo `role` para que usuários autenticados não
-- consigam se auto-promover a admin via REST.

-- 1) Drop TODAS as constraints antigas (se existirem)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_grade_level_check;
alter table public.profiles drop constraint if exists profiles_role_grade_check;
alter table public.content  drop constraint if exists content_grade_level_check;

-- 2) Migra dados legados
update public.profiles set role = 'professor' where role = 'teacher';
update public.profiles set grade_level = null where grade_level in ('high_school','ap_college');
update public.content  set grade_level = null where grade_level in ('high_school','ap_college');

-- 3) Reaplica as constraints corretas
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student','professor','admin'));

alter table public.profiles
  add constraint profiles_grade_level_check
  check (grade_level is null or grade_level in
    ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade'));

alter table public.content
  add constraint content_grade_level_check
  check (grade_level is null or grade_level in
    ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade'));

-- 4) Blinda o campo `role`: usuários autenticados podem ler/editar o próprio
--    profile, mas NÃO podem mudar o `role` (só service_role consegue).
revoke update (role) on public.profiles from authenticated;
revoke update (role) on public.profiles from anon;

-- 5) Reaplica trigger do profile (versão segura: nunca aceita role='admin')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role text;
begin
  requested_role := nullif(new.raw_user_meta_data->>'role', '');
  safe_role := case
    when requested_role in ('student','professor') then requested_role
    else 'student'
  end;
  insert into public.profiles (id, full_name, role, grade_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role,
    nullif(new.raw_user_meta_data->>'grade_level', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
