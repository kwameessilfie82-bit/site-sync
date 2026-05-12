-- Make onboarding idempotent and resilient when profile row is missing.
create or replace function public.create_my_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing_org uuid;
  new_org uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if org_name is null or length(trim(org_name)) < 2 then
    raise exception 'Invalid organization name';
  end if;

  select org_id into existing_org
  from public.profiles
  where id = uid;

  -- Idempotent behavior: if user already has an org, return it.
  if existing_org is not null then
    return existing_org;
  end if;

  insert into public.organizations (name)
  values (trim(org_name))
  returning id into new_org;

  -- Upsert profile so onboarding still works even if auth trigger missed profile creation.
  insert into public.profiles (id, org_id, role, display_name, email)
  values (uid, new_org, 'owner', '', null)
  on conflict (id) do update
    set org_id = excluded.org_id,
        role = 'owner'
  where public.profiles.org_id is null;

  if not exists (
    select 1
    from public.profiles
    where id = uid and org_id = new_org
  ) then
    raise exception 'Could not attach user profile to organization';
  end if;

  return new_org;
end;
$$;
