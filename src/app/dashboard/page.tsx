import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FileSpreadsheet,
  FolderKanban,
  HardHat,
  LogIn,
  Radio,
  RadioTower,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRbacSummary } from "@/lib/rbac";
import type { UserRole } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Badge } from "@/ui/primitives/badge";
import { Progress } from "@/ui/primitives/progress";

type Shortcut = { href: string; title: string; description: string; icon: LucideIcon };

const OWNER_SHORTCUTS: Shortcut[] = [
  {
    href: "/dashboard/projects",
    title: "Projects",
    description: "Job sites, log sheet templates, map geofences for clock-in, and active/inactive status.",
    icon: FolderKanban,
  },
  {
    href: "/dashboard/invites",
    title: "Invites & people",
    description: "Issue join links and browse the org directory in one place.",
    icon: Users,
  },
  {
    href: "/dashboard/field-logs",
    title: "Field logs",
    description: "Review QC-style submissions from the crew across projects.",
    icon: FileSpreadsheet,
  },
  {
    href: "/dashboard/attendance",
    title: "Attendance log",
    description: "Historical clock-in/out with date filters and CSV export.",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/incidents",
    title: "Incidents",
    description: "Safety and site issues with severity and follow-up.",
    icon: AlertTriangle,
  },
  {
    href: "/dashboard/settings",
    title: "Settings",
    description: "Audit log and Team accounts for manual login ↔ person linking when needed.",
    icon: Settings,
  },
];

const LEAD_SHORTCUTS: Shortcut[] = [
  {
    href: "/dashboard/projects",
    title: "Projects",
    description: "Sites, log sheets, geofences, and project lifecycle.",
    icon: FolderKanban,
  },
  {
    href: "/dashboard/invites",
    title: "Invites & people",
    description: "Onboard teammates and view the people directory.",
    icon: Users,
  },
  {
    href: "/dashboard/field-logs",
    title: "Field logs",
    description: "Submission history and templates.",
    icon: FileSpreadsheet,
  },
  {
    href: "/dashboard/check-in",
    title: "Check in / out",
    description: "Clock yourself at the job site when GPS allows.",
    icon: LogIn,
  },
  {
    href: "/dashboard/attendance/live",
    title: "Live attendance",
    description: "Who is clocked in right now across projects.",
    icon: Radio,
  },
  {
    href: "/dashboard/attendance",
    title: "Attendance log",
    description: "Filter by date and export CSV.",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/incidents",
    title: "Incidents",
    description: "Report and triage issues.",
    icon: AlertTriangle,
  },
];

const EMPLOYEE_SHORTCUTS: Shortcut[] = [
  {
    href: "/dashboard/field-logs",
    title: "Field logs",
    description: "Submit and review your daily logs.",
    icon: FileSpreadsheet,
  },
  {
    href: "/dashboard/check-in",
    title: "Check in / out",
    description: "Clock in at an assigned project within the site radius.",
    icon: LogIn,
  },
  {
    href: "/dashboard/attendance",
    title: "Attendance log",
    description: "Your past sessions.",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/incidents",
    title: "Incidents",
    description: "Log something that needs attention.",
    icon: AlertTriangle,
  },
];

function ShortcutCard({ href, title, description, icon: Icon }: Shortcut) {
  return (
    <Link
      href={href}
      className="group block rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full border-border/80 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/40">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
          <div className="rounded-md border bg-background p-2 text-muted-foreground group-hover:text-foreground">
            <Icon className="size-5 shrink-0" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
              <span className="truncate">{title}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </CardTitle>
            <CardDescription className="text-sm leading-snug">{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  const orgId = profile!.org_id!;
  const role = profile!.role as UserRole;
  const rbac = getRbacSummary(role);

  const [{ count: projectCount }, { count: peopleCount }, { count: openSessions }] =
    await Promise.all([
      supabase.from("projects").select("*", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("people").select("*", { count: "exact", head: true }).eq("org_id", orgId),
      supabase
        .from("attendance_sessions")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .is("clock_out_at", null),
    ]);

  const attendanceCoverage = peopleCount ? Math.round(((openSessions ?? 0) / peopleCount) * 100) : 0;

  const shortcuts = rbac.isOwner
    ? OWNER_SHORTCUTS
    : rbac.canManageProjectsPeopleRoster
      ? LEAD_SHORTCUTS
      : EMPLOYEE_SHORTCUTS;

  const shortcutHeading = rbac.isOwner
    ? "Where to go next"
    : rbac.canManageProjectsPeopleRoster
      ? "Field & office tools"
      : "Your shortcuts";

  const shortcutBlurb = rbac.isOwner
    ? "High-level controls for running the org. Supervisors and PMs still get check-in and live attendance from their overview."
    : rbac.canManageProjectsPeopleRoster
      ? "Projects, invites, project assignments, logs, and the live floor in one grid."
      : "Day-to-day tasks for your role.";

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-border/80 bg-linear-to-br from-primary/15 via-primary/5 to-transparent shadow-sm dark:from-primary/25 dark:via-primary/10">
        <CardHeader className="gap-3">
          <Badge variant="secondary" className="w-fit shadow-none">
            Operations Dashboard
          </Badge>
          <CardTitle className="font-heading text-2xl tracking-tight md:text-3xl">Overview</CardTitle>
          <CardDescription className="text-base">
            Snapshot of projects, people in the directory, and who is clocked in right now — plus quick paths to the
            work you do most often.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              Projects <ShieldCheck className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {projectCount ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              People <HardHat className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {peopleCount ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              Clocked in <RadioTower className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {openSessions ?? 0}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance coverage</CardTitle>
          <CardDescription>
            Share of people in the directory with an open session right now (informative, not a KPI target).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Currently clocked in</span>
            <span className="font-medium text-foreground">{attendanceCoverage}%</span>
          </div>
          <Progress value={attendanceCoverage} />
        </CardContent>
      </Card>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">{shortcutHeading}</h2>
        <p className="text-sm text-muted-foreground">{shortcutBlurb}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {shortcuts.map((s) => (
            <ShortcutCard key={s.href} {...s} />
          ))}
        </div>
      </div>
    </div>
  );
}
