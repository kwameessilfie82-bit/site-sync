-- Site Sync: workforce attendance & accountability
-- Run via Supabase SQL Editor or: supabase db push

create extension if not exists "pgcrypto";

-- Roles for app users (auth-linked)
do $$ begin
  create type public.user_role as enum ('owner', 'pm', 'supervisor', 'worker');
exception
  when duplicate_object then null;
end $$;

-- Organizations (tenant)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Profile per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete set null,
  email text,
  display_name text not null default '',
  role public.user_role not null default 'worker',
  person_id uuid,
  created_at timestamptz not null default now()
);

-- Subcontractors / employers
create table if not exists public.employers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Field workers (may exist without login)
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  employer_id uuid references public.employers (id) on delete set null,
  full_name text not null,
  phone text,
  technician_id text,
  trade text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_person_id_fkey;

alter table public.profiles
  add constraint profiles_person_id_fkey
  foreign key (person_id) references public.people (id) on delete set null;

create index if not exists people_org_idx on public.people (org_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  client_name text,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists projects_org_idx on public.projects (org_id);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  latitude double precision,
  longitude double precision,
  geofence_radius_m double precision,
  created_at timestamptz not null default now()
);

create index if not exists sites_project_idx on public.sites (project_id);

create table if not exists public.site_check_in_tokens (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  token text not null unique,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists site_tokens_site_idx on public.site_check_in_tokens (site_id);

create table if not exists public.roster_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  valid_from date not null default (now() at time zone 'utc')::date,
  valid_to date,
  created_at timestamptz not null default now()
);

create index if not exists roster_org_idx on public.roster_assignments (org_id);
create index if not exists roster_person_idx on public.roster_assignments (person_id);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete restrict,
  clock_in_at timestamptz not null default now(),
  clock_out_at timestamptz,
  clock_in_lat double precision,
  clock_in_lng double precision,
  clock_out_lat double precision,
  clock_out_lng double precision,
  method text not null default 'self',
  site_check_in_token_id uuid references public.site_check_in_tokens (id) on delete set null,
  notes text,
  attested_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists one_open_session_per_person
  on public.attendance_sessions (person_id)
  where clock_out_at is null;

create index if not exists attendance_org_idx on public.attendance_sessions (org_id);
create index if not exists attendance_site_idx on public.attendance_sessions (site_id);
create index if not exists attendance_clock_in_idx on public.attendance_sessions (clock_in_at desc);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_org_idx on public.audit_events (org_id, created_at desc);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  site_id uuid references public.sites (id) on delete set null,
  title text not null,
  description text not null default '',
  severity text not null default 'low',
  reported_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists incidents_org_idx on public.incidents (org_id);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  tag text,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_checkouts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  checked_out_at timestamptz not null default now(),
  checked_in_at timestamptz,
  notes text
);

create index if not exists assets_org_idx on public.assets (org_id);

-- New auth user → profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Onboarding: creates org and attaches profile (bypasses RLS safely)
create or replace function public.create_my_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org uuid;
begin
  if org_name is null or length(trim(org_name)) < 2 then
    raise exception 'Invalid organization name';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and org_id is not null) then
    raise exception 'Already in an organization';
  end if;
  insert into public.organizations (name) values (trim(org_name)) returning id into new_org;
  update public.profiles
    set org_id = new_org, role = 'owner'
    where id = auth.uid() and org_id is null;
  return new_org;
end;
$$;

grant execute on function public.create_my_organization(text) to authenticated;

-- RLS
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.employers enable row level security;
alter table public.people enable row level security;
alter table public.projects enable row level security;
alter table public.sites enable row level security;
alter table public.site_check_in_tokens enable row level security;
alter table public.roster_assignments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.audit_events enable row level security;
alter table public.incidents enable row level security;
alter table public.assets enable row level security;
alter table public.asset_checkouts enable row level security;

-- Helper: current user's org
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

grant usage on schema public to postgres, anon, authenticated, service_role;

-- Organizations: members read their org
drop policy if exists "org_select_member" on public.organizations;
create policy "org_select_member" on public.organizations
  for select using (id = public.current_org_id());

drop policy if exists "org_insert_authenticated" on public.organizations;

drop policy if exists "org_update_owner" on public.organizations;
create policy "org_update_owner" on public.organizations
  for update using (id = public.current_org_id())
  with check (id = public.current_org_id());

-- Profiles
drop policy if exists "profiles_select_self_or_org" on public.profiles;
create policy "profiles_select_self_or_org" on public.profiles
  for select using (
    id = auth.uid()
    or org_id = public.current_org_id()
  );

drop policy if exists "profiles_update_self" on public.profiles;
-- Display name updates; org_id / role changes use create_my_organization or admin SQL.
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "profiles_update_leads_same_org" on public.profiles;
create policy "profiles_update_leads_same_org" on public.profiles
  for update using (
    org_id = public.current_org_id()
    and public.current_profile_role() in ('owner', 'pm')
    and id <> auth.uid()
  )
  with check (org_id = public.current_org_id());

-- Employers
drop policy if exists "employers_all_org" on public.employers;
create policy "employers_all_org" on public.employers
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- People
drop policy if exists "people_all_org" on public.people;
create policy "people_all_org" on public.people
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- Projects
drop policy if exists "projects_all_org" on public.projects;
create policy "projects_all_org" on public.projects
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- Sites (via project org — enforce project belongs to org)
drop policy if exists "sites_all_org" on public.sites;
create policy "sites_all_org" on public.sites
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = sites.project_id and p.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = sites.project_id and p.org_id = public.current_org_id()
    )
  );

-- Site tokens
drop policy if exists "tokens_all_org" on public.site_check_in_tokens;
create policy "tokens_all_org" on public.site_check_in_tokens
  for all using (
    exists (
      select 1 from public.sites s
      join public.projects p on p.id = s.project_id
      where s.id = site_check_in_tokens.site_id and p.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.sites s
      join public.projects p on p.id = s.project_id
      where s.id = site_check_in_tokens.site_id and p.org_id = public.current_org_id()
    )
  );

-- Roster
drop policy if exists "roster_all_org" on public.roster_assignments;
create policy "roster_all_org" on public.roster_assignments
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- Attendance
drop policy if exists "attendance_select_org" on public.attendance_sessions;
create policy "attendance_select_org" on public.attendance_sessions
  for select using (org_id = public.current_org_id());

drop policy if exists "attendance_insert_org" on public.attendance_sessions;
create policy "attendance_insert_org" on public.attendance_sessions
  for insert with check (
    org_id = public.current_org_id()
    and exists (select 1 from public.people pe where pe.id = person_id and pe.org_id = public.current_org_id())
    and (
      public.current_profile_role() in ('owner', 'pm', 'supervisor')
      or person_id = (select person_id from public.profiles where id = auth.uid())
    )
  );

drop policy if exists "attendance_update_org" on public.attendance_sessions;
create policy "attendance_update_org" on public.attendance_sessions
  for update using (
    org_id = public.current_org_id()
    and (
      public.current_profile_role() in ('owner', 'pm', 'supervisor')
      or person_id is not distinct from (select pr.person_id from public.profiles pr where pr.id = auth.uid())
    )
  )
  with check (org_id = public.current_org_id());

drop policy if exists "attendance_delete_leads" on public.attendance_sessions;
create policy "attendance_delete_leads" on public.attendance_sessions
  for delete using (
    org_id = public.current_org_id()
    and public.current_profile_role() in ('owner', 'pm')
  );

-- Audit
drop policy if exists "audit_select_org" on public.audit_events;
create policy "audit_select_org" on public.audit_events
  for select using (org_id = public.current_org_id());

drop policy if exists "audit_insert_org" on public.audit_events;
create policy "audit_insert_org" on public.audit_events
  for insert with check (
    org_id = public.current_org_id()
    and (actor_id is null or actor_id = auth.uid())
  );

-- Incidents
drop policy if exists "incidents_all_org" on public.incidents;
create policy "incidents_all_org" on public.incidents
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- Assets
drop policy if exists "assets_all_org" on public.assets;
create policy "assets_all_org" on public.assets
  for all using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "asset_checkouts_all_org" on public.asset_checkouts;
create policy "asset_checkouts_all_org" on public.asset_checkouts
  for all using (
    exists (
      select 1 from public.assets a
      where a.id = asset_checkouts.asset_id and a.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.assets a
      where a.id = asset_checkouts.asset_id and a.org_id = public.current_org_id()
    )
  );

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
