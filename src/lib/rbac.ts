import type { UserRole } from "@/types/database";

/** Every signed-in org member */
export const ALL_ORG_ROLES: UserRole[] = ["owner", "pm", "supervisor", "worker"];

/** Field leads: projects, people, roster, live floor, assets, invites */
export const FIELD_LEAD_ROLES: UserRole[] = ["owner", "pm", "supervisor"];

/** Home office / compliance */
export const STAFF_ROLES: UserRole[] = ["owner", "pm"];

/**
 * Longest-prefix wins. First matching rule decides access.
 * Keep more specific paths above shorter ones when sorting.
 */
const DASHBOARD_ROUTE_RULES: { prefix: string; allowedRoles: UserRole[] }[] = [
  { prefix: "/dashboard/projects", allowedRoles: FIELD_LEAD_ROLES },
  { prefix: "/dashboard/people", allowedRoles: FIELD_LEAD_ROLES },
  { prefix: "/dashboard/team", allowedRoles: STAFF_ROLES },
  { prefix: "/dashboard/invites", allowedRoles: FIELD_LEAD_ROLES },
  { prefix: "/dashboard/roster", allowedRoles: FIELD_LEAD_ROLES },
  { prefix: "/dashboard/attendance/live", allowedRoles: FIELD_LEAD_ROLES },
  { prefix: "/dashboard/attendance", allowedRoles: ALL_ORG_ROLES },
  { prefix: "/dashboard/check-in", allowedRoles: ALL_ORG_ROLES },
  { prefix: "/dashboard/incidents", allowedRoles: ALL_ORG_ROLES },
  { prefix: "/dashboard/assets", allowedRoles: FIELD_LEAD_ROLES },
  { prefix: "/dashboard/audit", allowedRoles: STAFF_ROLES },
  { prefix: "/dashboard/settings", allowedRoles: ALL_ORG_ROLES },
  { prefix: "/dashboard", allowedRoles: ALL_ORG_ROLES },
];

const SORTED_RULES = [...DASHBOARD_ROUTE_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

/**
 * Whether the user may open this pathname under /dashboard.
 * Unknown paths under /dashboard are denied.
 */
export function canAccessDashboardPath(pathname: string, role: UserRole): boolean {
  if (!pathname.startsWith("/dashboard")) return true;

  for (const rule of SORTED_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.allowedRoles.includes(role);
    }
  }

  return false;
}

/** Sidebar / primary nav: same as route access for listed hrefs */
export function canSeeNavHref(href: string, role: UserRole): boolean {
  return canAccessDashboardPath(href, role);
}

export function getRbacSummary(role: UserRole) {
  return {
    role,
    isOwner: role === "owner",
    isPm: role === "pm",
    isSupervisor: role === "supervisor",
    isWorker: role === "worker",
    canManageProjectsPeopleRoster: FIELD_LEAD_ROLES.includes(role),
    canManageTeamAndAudit: STAFF_ROLES.includes(role),
    canSuperviseFloor: FIELD_LEAD_ROLES.includes(role),
    canInvite: FIELD_LEAD_ROLES.includes(role),
  };
}
