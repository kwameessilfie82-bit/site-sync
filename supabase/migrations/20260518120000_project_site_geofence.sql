-- Job site for maps + GPS clock-in geofence (meters from center).
alter table public.projects
  add column if not exists site_latitude double precision,
  add column if not exists site_longitude double precision,
  add column if not exists site_radius_m double precision;

comment on column public.projects.site_latitude is 'Work site latitude (WGS84).';
comment on column public.projects.site_longitude is 'Work site longitude (WGS84).';
comment on column public.projects.site_radius_m is 'Clock-in allowed within this many meters of the site center when all three site fields are set.';
