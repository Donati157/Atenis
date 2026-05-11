-- Automatically create a profile row when a new auth user signs up.
-- Reads full_name, role and grade_level from raw_user_meta_data, BUT never
-- trusts role='admin' from the client — admins must be promoted via SQL
-- (see scripts/005_promote_admin.sql).

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

  -- Only 'student' and 'professor' can be self-assigned. Anything else
  -- (including 'admin', typos, or malicious payloads) falls back to 'student'.
  safe_role := case
    when requested_role in ('student', 'professor') then requested_role
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
