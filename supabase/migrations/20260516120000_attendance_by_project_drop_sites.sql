-- Attendance: project instead of site; remove sites and check-in tokens.

-- 1) Project on each attendance row (nullable until backfilled)
alter table public.attendance_sessions
  add column if not exists project_id uuid references public.projects (id) on delete restrict;

-- 2) Backfill from existing sites (skip when `site_id` was already removed)
do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'attendance_sessions'
      and c.column_name = 'site_id'
  ) then
    update public.attendance_sessions a
    set project_id = s.project_id
    from public.sites s
    where s.id = a.site_id;
  end if;
end $$;

do $$
begin
  if exists (select 1 from public.attendance_sessions where project_id is null) then
    raise exception 'Migration failed: attendance_sessions.project_id is null for some rows';
  end if;
end $$;

-- 3) Remove site / token columns from attendance
alter table public.attendance_sessions drop constraint if exists attendance_sessions_site_check_in_token_id_fkey;
alter table public.attendance_sessions drop column if exists site_check_in_token_id;

alter table public.attendance_sessions drop constraint if exists attendance_sessions_site_id_fkey;
alter table public.attendance_sessions drop column if exists site_id;

alter table public.attendance_sessions alter column project_id set not null;

drop index if exists attendance_site_idx;
create index if not exists attendance_project_idx on public.attendance_sessions (project_id);

-- 4) Incidents: project only (drop optional site)
alter table public.incidents drop constraint if exists incidents_site_id_fkey;
alter table public.incidents drop column if exists site_id;

-- 5) Drop site tables (order: tokens reference sites)
drop table if exists public.site_check_in_tokens cascade;
drop table if exists public.sites cascade;
