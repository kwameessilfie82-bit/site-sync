import type { UserRole } from "@/types/database";
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
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

const allItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/people", label: "People", icon: Users },
  { href: "/dashboard/invites", label: "Invites", icon: MailPlus, roles: ["owner", "pm", "supervisor"] },
  { href: "/dashboard/team", label: "Team accounts", icon: UserCog, roles: ["owner", "pm"] },
  { href: "/dashboard/roster", label: "Roster", icon: CalendarRange },
  { href: "/dashboard/check-in", label: "Check in / out", icon: LogIn },
  { href: "/dashboard/attendance/live", label: "Live on site", icon: Radio },
  { href: "/dashboard/attendance", label: "Attendance log", icon: ClipboardList },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/assets", label: "Assets", icon: Package },
  { href: "/dashboard/audit", label: "Audit log", icon: ScrollText, roles: ["owner", "pm"] },
];

export function getDashboardNavItems(role: UserRole): DashboardNavItem[] {
  return allItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });
}
