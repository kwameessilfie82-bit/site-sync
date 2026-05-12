-- When a user accepts an org invite, add them to the people directory and link person_id.

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

  update public.organization_invites
  set used_at = now(),
      accepted_by = uid
  where id = inv.id;

  return inv.org_id;
end;
$$;
