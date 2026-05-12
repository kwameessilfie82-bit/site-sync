export type UserRole = "owner" | "pm" | "supervisor" | "worker";

export type Profile = {
  id: string;
  org_id: string | null;
  email: string | null;
  display_name: string;
  role: UserRole;
  person_id: string | null;
  created_at: string;
};

export type Organization = {
  id: string;
  name: string;
  created_at: string;
};

export type Project = {
  id: string;
  org_id: string;
  name: string;
  client_name: string | null;
  code: string | null;
  is_active: boolean;
  created_at: string;
};

export type Site = {
  id: string;
  project_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number | null;
  created_at: string;
};

export type Person = {
  id: string;
  org_id: string;
  employer_id: string | null;
  full_name: string;
  phone: string | null;
  technician_id: string | null;
  trade: string | null;
  is_active: boolean;
  created_at: string;
};

export type AttendanceSession = {
  id: string;
  org_id: string;
  person_id: string;
  site_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  method: string;
  site_check_in_token_id: string | null;
  notes: string | null;
  attested_by: string | null;
  created_at: string;
};
