-- Replace `high_school` with explicit 10th/11th/12th grade values on existing DBs.
-- Safe to run multiple times.

alter table public.profiles drop constraint if exists profiles_grade_level_check;
alter table public.content drop constraint if exists content_grade_level_check;

update public.profiles set grade_level = null where grade_level = 'high_school';
update public.content set grade_level = null where grade_level = 'high_school';

alter table public.profiles
  add constraint profiles_grade_level_check
  check (grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade','ap_college'));

alter table public.content
  add constraint content_grade_level_check
  check (grade_level in ('6th_grade','7th_grade','8th_grade','9th_grade','10th_grade','11th_grade','12th_grade','ap_college'));
