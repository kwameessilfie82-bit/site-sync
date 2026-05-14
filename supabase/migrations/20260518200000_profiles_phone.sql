-- Optional contact phone on the auth profile (Settings).
alter table public.profiles
  add column if not exists phone text;

comment on column public.profiles.phone is 'User-editable contact phone; shown in Settings only unless synced to people.';
