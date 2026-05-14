import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";
import { rosterRowIsActive, todayYmdUtc } from "@/lib/project-assignment";

export type FieldLogProjectRow = {
  id: string;
  name: string;
  client_name: string | null;
};

export async function loadProjectsForFieldLogs(
  supabase: SupabaseClient,
  orgId: string,
  role: UserRole,
  personId: string | null,
): Promise<FieldLogProjectRow[]> {
  if (role === "employee" || role === "worker") {
    if (!personId) return [];
    const today = todayYmdUtc();
    const { data: roster } = await supabase
      .from("roster_assignments")
      .select("project_id, valid_from, valid_to")
      .eq("person_id", personId);

    const ids = [
      ...new Set(
        (roster ?? [])
          .filter((r) => rosterRowIsActive({ valid_from: r.valid_from, valid_to: r.valid_to }, today))
          .map((r) => r.project_id),
      ),
    ];
    if (ids.length === 0) return [];

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, client_name")
      .in("id", ids)
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("name");

    return (projects ?? []) as FieldLogProjectRow[];
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_name")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("name");

  return (projects ?? []) as FieldLogProjectRow[];
}

export async function employeeMayAccessProject(
  supabase: SupabaseClient,
  personId: string,
  projectId: string,
): Promise<boolean> {
  const today = todayYmdUtc();
  const { data: rows } = await supabase
    .from("roster_assignments")
    .select("id, valid_from, valid_to")
    .eq("person_id", personId)
    .eq("project_id", projectId);
  return (rows ?? []).some((r) => rosterRowIsActive({ valid_from: r.valid_from, valid_to: r.valid_to }, today));
}
