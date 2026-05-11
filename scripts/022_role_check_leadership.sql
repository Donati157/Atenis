-- 022: Atualiza profiles_role_check pra incluir 'leadership'.
-- A 021 adicionou a coluna leadership_title e os RPCs, mas esqueceu da
-- constraint do enum, que continuava só student/professor/admin.
-- Idempotente.

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
    check (role in ('student','professor','leadership','admin'));

notify pgrst, 'reload schema';
