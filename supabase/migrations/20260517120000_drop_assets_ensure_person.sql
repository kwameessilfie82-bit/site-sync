-- Remove assets; auto-create people row for org members missing person_id (check-in ready).

drop table if exists public.asset_checkouts cascade;
drop table if exists public.assets cascade;

-- Idempotent: link profile to a new people row when in an org but not yet linked.
create or replace function public.ensure_my_person_record()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_person_id uuid;
  v_disp text;
  v_em text;
  new_id uuid;
begin
  if auth.uid() is null then
    return;
  end if;

  select org_id, person_id, display_name, email
  into v_org_id, v_person_id, v_disp, v_em
  from public.profiles
  where id = auth.uid();

  if v_org_id is null or v_person_id is not null then
    return;
  end if;

  insert into public.people (org_id, full_name, is_active)
  values (
    v_org_id,
    coalesce(
      nullif(trim(coalesce(v_disp, '')), ''),
      nullif(split_part(coalesce(v_em, ''), '@', 1), ''),
      'Team member'
    ),
    true
  )
  returning id into new_id;

  update public.profiles
  set person_id = new_id
  where id = auth.uid()
    and org_id = v_org_id
    and person_id is null;
end;
$$;

grant execute on function public.ensure_my_person_record() to authenticated;
