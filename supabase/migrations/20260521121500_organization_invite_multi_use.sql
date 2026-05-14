-- Reusable org invite links: same token can onboard many users until expiry or revoke.

alter table public.organization_invites
  add column if not exists multi_use boolean not null default false;

alter table public.organization_invites
  add column if not exists max_uses int;

alter table public.organization_invites
  add column if not exists use_count int not null default 0;

alter table public.organization_invites
  add column if not exists last_accepted_at timestamptz;

comment on column public.organization_invites.multi_use is
  'When true, accepting the invite does not consume the row; use_count increments until max_uses or expiry.';
comment on column public.organization_invites.max_uses is
  'For multi_use invites: stop accepting after this many joins; null means unlimited until expiry or revoke.';

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'organization_invites' and c.conname = 'organization_invites_max_uses_positive'
  ) then
    alter table public.organization_invites
      add constraint organization_invites_max_uses_positive
      check (max_uses is null or max_uses >= 1);
  end if;
end $$;

drop function if exists public.create_organization_invite(public.user_role);

create or replace function public.create_organization_invite(
  p_invited_role public.user_role,
  p_multi_use boolean default false,
  p_max_uses int default null
)
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

  if coalesce(p_multi_use, false) and p_max_uses is not null and p_max_uses < 1 then
    raise exception 'max_uses must be at least 1 when set';
  end if;

  new_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.organization_invites (
    org_id,
    token,
    invited_role,
    invited_by,
    expires_at,
    multi_use,
    max_uses,
    use_count
  )
  values (
    v_org_id,
    new_token,
    p_invited_role,
    uid,
    now() + interval '14 days',
    coalesce(p_multi_use, false),
    case when coalesce(p_multi_use, false) then p_max_uses else null end,
    0
  );

  return new_token;
end;
$$;

grant execute on function public.create_organization_invite(public.user_role, boolean, int) to authenticated;

-- Keep one-arg callers working (Postgres overload resolution).
create or replace function public.create_organization_invite(p_invited_role public.user_role)
returns text
language sql
security definer
set search_path = public
as $$
  select public.create_organization_invite(p_invited_role, false, null);
$$;

grant execute on function public.create_organization_invite(public.user_role) to authenticated;

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
  new_person_id uuid;
  disp text;
  em text;
  existing_person uuid;
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
    and expires_at > now()
    and (
      (coalesce(multi_use, false) = false and used_at is null)
      or (
        coalesce(multi_use, false) = true
        and (max_uses is null or use_count < max_uses)
      )
    )
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

  select person_id, display_name, email into existing_person, disp, em
  from public.profiles
  where id = uid;

  if existing_person is null then
    insert into public.people (org_id, full_name, is_active)
    values (
      inv.org_id,
      coalesce(
        nullif(trim(coalesce(disp, '')), ''),
        nullif(split_part(coalesce(em, ''), '@', 1), ''),
        'Team member'
      ),
      true
    )
    returning id into new_person_id;

    update public.profiles
    set person_id = new_person_id
    where id = uid;
  end if;

  if coalesce(inv.multi_use, false) then
    update public.organization_invites
    set use_count = use_count + 1,
        last_accepted_at = now()
    where id = inv.id;
  else
    update public.organization_invites
    set used_at = now(),
        accepted_by = uid
    where id = inv.id;
  end if;

  return inv.org_id;
end;
$$;
