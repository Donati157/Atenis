-- Remove AP from grade_level, align role check with (student | professor | admin).
-- Safe to run multiple times on an existing DB.

-- 1) Grade level: drop old check, null out ap_college rows, reapply without it.
alter table public.profiles drop constraint if exists profiles_grade_level_check;
alter table public.content drop constraint if exists content_grade_level_check;

update public.profiles set grade_level = null where grade_level = 'ap_college';
update public.content  set grade_level = null where grade_level = 'ap_college';

alter table public.profiles
  add constraint profiles_grade_level_check
  check (grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade'));

alter table public.content
  add constraint content_grade_level_check
  check (grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade'));

-- 2) Role: rename existing 'teacher' rows to 'professor', then reapply check.
alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles set role = 'professor' where role = 'teacher';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student','professor','admin'));

-- 3) Students must have a grade_level; professors/admins must not.
alter table public.profiles drop constraint if exists profiles_role_grade_check;
alter table public.profiles
  add constraint profiles_role_grade_check
  check (
    (role = 'student' and grade_level is not null) or
    (role in ('professor','admin') and grade_level is null)
  ) not valid;
-- `not valid` lets old rows (e.g. students with null grade) pass until fixed manually.
