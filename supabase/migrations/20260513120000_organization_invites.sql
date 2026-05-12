-- Invites: owner / PM / supervisor can invite; new users accept during onboarding.

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  token text not null unique,
  invited_role public.user_role not null,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint organization_invites_role_not_owner check (invited_role <> 'owner')
);

create index if not exists organization_invites_org_idx on public.organization_invites (org_id);
create index if not exists organization_invites_token_idx on public.organization_invites (token);

alter table public.organization_invites enable row level security;

drop policy if exists "organization_invites_select_org" on public.organization_invites;
create policy "organization_invites_select_org" on public.organization_invites
  for select using (org_id = public.current_org_id());

drop policy if exists "organization_invites_delete_leads" on public.organization_invites;
create policy "organization_invites_delete_leads" on public.organization_invites
  for delete using (
    org_id = public.current_org_id()
    and public.current_profile_role() in ('owner', 'pm', 'supervisor')
    and used_at is null
  );

-- Create invite (security definer — inserts bypass RLS)
create or replace function public.create_organization_invite(p_invited_role public.user_role)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_org_id uuid;
  v_role text;
  new_token text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_invited_role = 'owner' then
    raise exception 'Cannot invite as owner';
  end if;

  select org_id, role::text into v_org_id, v_role
  from public.profiles
  where id = uid;

  if v_org_id is null then
    raise exception 'No organization';
  end if;

  if v_role not in ('owner', 'pm', 'supervisor') then
    raise exception 'Not allowed to create invites';
  end if;

  -- Use UUIDs only (built into PostgreSQL 13+). gen_random_bytes() needs pgcrypto and may be missing.
  new_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.organization_invites (org_id, token, invited_role, invited_by, expires_at)
  values (v_org_id, new_token, p_invited_role, uid, now() + interval '14 days');

  return new_token;
end;
$$;

grant execute on function public.create_organization_invite(public.user_role) to authenticated;

-- Accept invite (attach user to org)
create or replace function public.accept_organization_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv public.organization_invites%rowtype;
  v_org_id uuid;
  v_rowcount int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_token is null or length(trim(p_token)) < 8 then
    raise exception 'Invalid invite';
  end if;

  select org_id into v_org_id from public.profiles where id = uid;
  if v_org_id is not null then
    raise exception 'Already belongs to an organization';
  end if;

  select * into inv
  from public.organization_invites
  where token = trim(p_token)
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invite is invalid or expired';
  end if;

  update public.profiles
  set org_id = inv.org_id,
      role = inv.invited_role
  where id = uid
    and org_id is null;

  get diagnostics v_rowcount = row_count;
  if v_rowcount = 0 then
    raise exception 'Could not update profile';
  end if;

  update public.organization_invites
  set used_at = now(),
      accepted_by = uid
  where id = inv.id;

  return inv.org_id;
end;
$$;

grant execute on function public.accept_organization_invite(text) to authenticated;
