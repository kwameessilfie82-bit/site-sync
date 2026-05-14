/** `worker` is legacy; prefer `employee`. DB migration maps worker → employee. */
export type UserRole = "owner" | "pm" | "supervisor" | "employee" | "worker";

export type Profile = {
  id: string;
  org_id: string | null;
  email: string | null;
  display_name: string;
  phone: string | null;
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
  site_latitude: number | null;
  site_longitude: number | null;
  site_radius_m: number | null;
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

export type ProjectLogSheet = {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type ProjectLogSheetColumn = {
  id: string;
  log_sheet_id: string;
  column_key: string;
  label: string;
  sort_order: number;
  created_at: string;
};

export type ProjectActivityLog = {
  id: string;
  org_id: string;
  project_id: string;
  log_sheet_id: string;
  author_profile_id: string;
  author_person_id: string | null;
  client_name: string;
  work_location: string;
  log_date: string;
  geomembrane_material: string;
  geomembrane_thickness: string;
  geomembrane_texture: string;
  custom_values: Record<string, string>;
  created_at: string;
};

export type Incident = {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  description: string;
  severity: string;
  reported_by: string | null;
  photo_storage_path: string | null;
  created_at: string;
};

export type AttendanceSession = {
  id: string;
  org_id: string;
  person_id: string;
  project_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  method: string;
  notes: string | null;
  attested_by: string | null;
  created_at: string;
};
