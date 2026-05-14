import type { UserRole } from "@/types/database";

/** Every signed-in org member (includes legacy `worker`). */
export const ALL_ORG_ROLES: UserRole[] = ["owner", "pm", "supervisor", "employee", "worker"];

/** Field leads: projects, live floor, invites (people directory lives under invites). Assignments live on each project. */
export const FIELD_LEAD_ROLES: UserRole[] = ["owner", "pm", "supervisor"];

/** Home office / compliance */
export const STAFF_ROLES: UserRole[] = ["owner", "pm"];

/**
 * Longest-prefix wins. First matching rule decides access.
 * Keep more specific paths above shorter ones when sorting.
 */
const DASHBOARD_ROUTE_RULES: { prefix: string; allowedRoles: UserRole[] }[] = [
  { prefix: "/dashboard/awaiting-project", allowedRoles: ["employee", "worker"] },
  { prefix: "/dashboard/projects", allowedRoles: FIELD_LEAD_ROLES },
  { prefix: "/dashboard/team", allowedRoles: STAFF_ROLES },
  { prefix: "/dashboard/invites", allowedRoles: FIELD_LEAD_ROLES },
  { prefix: "/dashboard/attendance/live", allowedRoles: FIELD_LEAD_ROLES },
  { prefix: "/dashboard/attendance", allowedRoles: ALL_ORG_ROLES },
  { prefix: "/dashboard/check-in", allowedRoles: ALL_ORG_ROLES },
  { prefix: "/dashboard/incidents", allowedRoles: ALL_ORG_ROLES },
  { prefix: "/dashboard/audit", allowedRoles: STAFF_ROLES },
  { prefix: "/dashboard/field-logs", allowedRoles: ALL_ORG_ROLES },
  { prefix: "/dashboard/settings", allowedRoles: ALL_ORG_ROLES },
  { prefix: "/dashboard", allowedRoles: ALL_ORG_ROLES },
];

const SORTED_RULES = [...DASHBOARD_ROUTE_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * Whether the user may open this pathname under /dashboard.
 * Unknown paths under /dashboard are denied.
 */
export function canAccessDashboardPath(pathname: string, role: UserRole): boolean {
  const p = normalizePath(pathname);
  if (p === "/dashboard") {
    return role !== "employee" && role !== "worker";
  }

  for (const rule of SORTED_RULES) {
    if (p === rule.prefix || p.startsWith(`${rule.prefix}/`)) {
      return rule.allowedRoles.includes(role);
    }
  }

  return false;
}

/** Sidebar / primary nav: same as route access for listed hrefs */
export function canSeeNavHref(href: string, role: UserRole): boolean {
  return canAccessDashboardPath(href, role);
}

/** Owner: hide field logs, check-in, team, audit from main nav. PM: hide audit (both use Settings links). */
export function shouldShowInMainNav(href: string, role: UserRole): boolean {
  if (!canSeeNavHref(href, role)) return false;
  if (role === "owner") {
    if (
      ["/dashboard/field-logs", "/dashboard/check-in", "/dashboard/team", "/dashboard/audit"].includes(href)
    ) {
      return false;
    }
  }
  if (role === "pm" && href === "/dashboard/audit") return false;
  return true;
}

export function getRbacSummary(role: UserRole) {
  return {
    role,
    isOwner: role === "owner",
    isPm: role === "pm",
    isSupervisor: role === "supervisor",
    isEmployee: role === "employee" || role === "worker",
    canManageProjectsPeopleRoster: FIELD_LEAD_ROLES.includes(role),
    canManageTeamAndAudit: STAFF_ROLES.includes(role),
    canSuperviseFloor: FIELD_LEAD_ROLES.includes(role),
    canInvite: FIELD_LEAD_ROLES.includes(role),
  };
}
