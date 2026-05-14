-- Rename app role worker → employee; add project log sheets, dynamic columns, and submissions.
-- Enum value `employee` is added in migration 20260514135859_user_role_add_employee_enum.sql (separate commit).

-- 1) Migrate existing worker rows (worker value remains on enum for backwards compatibility)
update public.profiles set role = 'employee'::public.user_role where role::text = 'worker';
update public.organization_invites set invited_role = 'employee'::public.user_role where invited_role::text = 'worker';

alter table public.profiles alter column role set default 'employee'::public.user_role;

-- 2) Log sheets per project (UI: "Activity" — owner-defined templates like Patch Repair, Spark Test)
create table if not exists public.project_log_sheets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_log_sheets_project_idx on public.project_log_sheets (project_id);

create table if not exists public.project_log_sheet_columns (
  id uuid primary key default gen_random_uuid(),
  log_sheet_id uuid not null references public.project_log_sheets (id) on delete cascade,
  column_key text not null,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint project_log_sheet_columns_key unique (log_sheet_id, column_key)
);

create index if not exists project_log_sheet_columns_sheet_idx on public.project_log_sheet_columns (log_sheet_id);

create table if not exists public.project_activity_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  log_sheet_id uuid not null references public.project_log_sheets (id) on delete restrict,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  author_person_id uuid references public.people (id) on delete set null,
  client_name text not null,
  work_location text not null,
  log_date date not null,
  geomembrane_material text not null,
  geomembrane_thickness text not null,
  geomembrane_texture text not null,
  custom_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_activity_logs_org_idx on public.project_activity_logs (org_id, created_at desc);
create index if not exists project_activity_logs_project_idx on public.project_activity_logs (project_id, created_at desc);
create index if not exists project_activity_logs_sheet_idx on public.project_activity_logs (log_sheet_id);

alter table public.project_log_sheets enable row level security;
alter table public.project_log_sheet_columns enable row level security;
alter table public.project_activity_logs enable row level security;

-- Log sheets: read org members; write field leads
drop policy if exists "project_log_sheets_select_org" on public.project_log_sheets;
create policy "project_log_sheets_select_org" on public.project_log_sheets
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_log_sheets.project_id and p.org_id = public.current_org_id()
    )
  );

drop policy if exists "project_log_sheets_write_leads" on public.project_log_sheets;
create policy "project_log_sheets_write_leads" on public.project_log_sheets
  for all using (
    public.current_profile_role() in ('owner', 'pm', 'supervisor')
    and exists (
      select 1 from public.projects p
      where p.id = project_log_sheets.project_id and p.org_id = public.current_org_id()
    )
  )
  with check (
    public.current_profile_role() in ('owner', 'pm', 'supervisor')
    and exists (
      select 1 from public.projects p
      where p.id = project_log_sheets.project_id and p.org_id = public.current_org_id()
    )
  );

-- Columns
drop policy if exists "project_log_sheet_columns_select_org" on public.project_log_sheet_columns;
create policy "project_log_sheet_columns_select_org" on public.project_log_sheet_columns
  for select using (
    exists (
      select 1 from public.project_log_sheets s
      join public.projects p on p.id = s.project_id
      where s.id = project_log_sheet_columns.log_sheet_id and p.org_id = public.current_org_id()
    )
  );

drop policy if exists "project_log_sheet_columns_write_leads" on public.project_log_sheet_columns;
create policy "project_log_sheet_columns_write_leads" on public.project_log_sheet_columns
  for all using (
    public.current_profile_role() in ('owner', 'pm', 'supervisor')
    and exists (
      select 1 from public.project_log_sheets s
      join public.projects p on p.id = s.project_id
      where s.id = project_log_sheet_columns.log_sheet_id and p.org_id = public.current_org_id()
    )
  )
  with check (
    public.current_profile_role() in ('owner', 'pm', 'supervisor')
    and exists (
      select 1 from public.project_log_sheets s
      join public.projects p on p.id = s.project_id
      where s.id = project_log_sheet_columns.log_sheet_id and p.org_id = public.current_org_id()
    )
  );

-- Activity log rows
drop policy if exists "project_activity_logs_select_org" on public.project_activity_logs;
create policy "project_activity_logs_select_org" on public.project_activity_logs
  for select using (org_id = public.current_org_id());

drop policy if exists "project_activity_logs_insert_org" on public.project_activity_logs;
create policy "project_activity_logs_insert_org" on public.project_activity_logs
  for insert with check (
    org_id = public.current_org_id()
    and author_profile_id = auth.uid()
    and exists (select 1 from public.projects pr where pr.id = project_id and pr.org_id = public.current_org_id())
    and exists (
      select 1 from public.project_log_sheets s
      where s.id = log_sheet_id and s.project_id = project_activity_logs.project_id
    )
  );

drop policy if exists "project_activity_logs_update_self_or_leads" on public.project_activity_logs;
create policy "project_activity_logs_update_self_or_leads" on public.project_activity_logs
  for update using (
    org_id = public.current_org_id()
    and (
      author_profile_id = auth.uid()
      or public.current_profile_role() in ('owner', 'pm', 'supervisor')
    )
  )
  with check (org_id = public.current_org_id());

drop policy if exists "project_activity_logs_delete_leads" on public.project_activity_logs;
create policy "project_activity_logs_delete_leads" on public.project_activity_logs
  for delete using (
    org_id = public.current_org_id()
    and public.current_profile_role() in ('owner', 'pm', 'supervisor')
  );

grant select, insert, update, delete on public.project_log_sheets to authenticated;
grant select, insert, update, delete on public.project_log_sheet_columns to authenticated;
grant select, insert, update, delete on public.project_activity_logs to authenticated;
