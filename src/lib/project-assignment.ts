import type { SupabaseClient } from "@supabase/supabase-js";

export type RosterDateRow = { valid_from: string; valid_to: string | null };

/** Compare calendar dates as `YYYY-MM-DD` strings (DB `date` columns). */
export function rosterRowIsActive(row: RosterDateRow, todayYmd: string): boolean {
  if (row.valid_from > todayYmd) return false;
  if (row.valid_to != null && row.valid_to < todayYmd) return false;
  return true;
}

export function todayYmdUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function employeeHasActiveProjectAssignment(
  supabase: SupabaseClient,
  personId: string,
): Promise<boolean> {
  const today = todayYmdUtc();
  const { data: rows } = await supabase
    .from("roster_assignments")
    .select("id, valid_from, valid_to")
    .eq("person_id", personId);

  return (rows ?? []).some((r) => rosterRowIsActive(r, today));
}

/** Employees / workers with no person row or no active project assignment should be gated to awaiting + settings. */
export async function employeePendingProjectGate(
  supabase: SupabaseClient,
  role: string,
  personId: string | null,
): Promise<boolean> {
  if (role !== "employee" && role !== "worker") return false;
  if (!personId) return true;
  return !(await employeeHasActiveProjectAssignment(supabase, personId));
}

const PENDING_ALLOWED_PREFIXES = [
  "/dashboard/awaiting-project",
  "/dashboard/settings",
  "/dashboard/check-in",
] as const;

export function pathAllowedForPendingEmployee(pathname: string): boolean {
  const p = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return PENDING_ALLOWED_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}
