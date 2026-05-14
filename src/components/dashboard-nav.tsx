import type { UserRole } from "@/types/database";
import { shouldShowInMainNav } from "@/lib/rbac";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCog,
  ClipboardList,
  Radio,
  LogIn,
  AlertTriangle,
  ScrollText,
  Settings,
  FileSpreadsheet,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Order preserved; RBAC + role-based nav hiding in `src/lib/rbac.ts` */
const allItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/field-logs", label: "Field logs", icon: FileSpreadsheet },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/invites", label: "Invites & people", icon: Users },
  { href: "/dashboard/team", label: "Team accounts", icon: UserCog },
  { href: "/dashboard/check-in", label: "Check in / out", icon: LogIn },
  { href: "/dashboard/attendance/live", label: "Live attendance", icon: Radio },
  { href: "/dashboard/attendance", label: "Attendance log", icon: ClipboardList },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/audit", label: "Audit log", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function getDashboardNavItems(role: UserRole): DashboardNavItem[] {
  return allItems.filter((item) => shouldShowInMainNav(item.href, role));
}
