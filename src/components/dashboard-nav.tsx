"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/types/database";
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
} from "lucide-react";

const allLinks: {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
}[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/people", label: "People", icon: Users },
  { href: "/dashboard/team", label: "Team accounts", icon: UserCog, roles: ["owner", "pm"] },
  { href: "/dashboard/roster", label: "Roster", icon: CalendarRange },
  { href: "/dashboard/check-in", label: "Check in / out", icon: LogIn },
  { href: "/dashboard/attendance/live", label: "Live on site", icon: Radio },
  { href: "/dashboard/attendance", label: "Attendance log", icon: ClipboardList },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/assets", label: "Assets", icon: Package },
  {
    href: "/dashboard/audit",
    label: "Audit log",
    icon: ScrollText,
    roles: ["owner", "pm"],
  },
];

export function DashboardNav({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  const pathname = usePathname();
  const links = allLinks.filter((l) => {
    if (!l.roles) return true;
    return l.roles.includes(role);
  });

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
            pathname === href || pathname.startsWith(`${href}/`)
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
