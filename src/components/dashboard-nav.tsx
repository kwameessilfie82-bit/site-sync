import type { UserRole } from "@/types/database";
import { canSeeNavHref } from "@/lib/rbac";
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
  Package,
  ScrollText,
  CalendarRange,
  MailPlus,
  Settings,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Order preserved; RBAC filters by route in `src/lib/rbac.ts` */
const allItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/people", label: "People", icon: Users },
  { href: "/dashboard/invites", label: "Invites", icon: MailPlus },
  { href: "/dashboard/team", label: "Team accounts", icon: UserCog },
  { href: "/dashboard/roster", label: "Roster", icon: CalendarRange },
  { href: "/dashboard/check-in", label: "Check in / out", icon: LogIn },
  { href: "/dashboard/attendance/live", label: "Live on site", icon: Radio },
  { href: "/dashboard/attendance", label: "Attendance log", icon: ClipboardList },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/assets", label: "Assets", icon: Package },
  { href: "/dashboard/audit", label: "Audit log", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function getDashboardNavItems(role: UserRole): DashboardNavItem[] {
  return allItems.filter((item) => canSeeNavHref(item.href, role));
}
