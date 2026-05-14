import type { UserRole } from "@/types/database";

export function defaultDashboardPath(role: UserRole): string {
  return role === "employee" || role === "worker" ? "/dashboard/field-logs" : "/dashboard";
}
