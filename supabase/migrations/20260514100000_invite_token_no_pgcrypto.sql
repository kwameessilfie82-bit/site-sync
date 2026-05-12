-- Fix: gen_random_bytes() requires pgcrypto; Supabase / some pools omit it from search_path.
-- Regenerate tokens using gen_random_uuid() (available without pgcrypto on PG 13+).

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

  new_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.organization_invites (org_id, token, invited_role, invited_by, expires_at)
  values (v_org_id, new_token, p_invited_role, uid, now() + interval '14 days');

  return new_token;
end;
$$;
