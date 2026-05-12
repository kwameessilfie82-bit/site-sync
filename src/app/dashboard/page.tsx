import Link from "next/link";
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
import { Button } from "@/ui/primitives/button";
import { Badge } from "@/ui/primitives/badge";
import { Progress } from "@/ui/primitives/progress";
import { ArrowRight, HardHat, RadioTower, ShieldCheck } from "lucide-react";

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

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent shadow-sm dark:from-primary/25 dark:via-primary/10">
        <CardHeader className="gap-3">
          <Badge variant="secondary" className="w-fit shadow-none">
            Operations Dashboard
          </Badge>
          <CardTitle className="font-heading text-2xl tracking-tight md:text-3xl">Overview</CardTitle>
          <CardDescription className="text-base">
            {rbac.isWorker
              ? "Your org snapshot — use the sidebar for check-in and your log."
              : "Live snapshot of projects, workforce coverage, and accountability status."}
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
              On site now <RadioTower className="size-4" />
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
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Currently clocked in</span>
            <span className="font-medium text-foreground">{attendanceCoverage}%</span>
          </div>
          <Progress value={attendanceCoverage} />
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {rbac.canManageProjectsPeopleRoster ? (
          <Button asChild className="justify-between">
            <Link href="/dashboard/projects">
              Manage projects <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/attendance">
              Attendance log <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="justify-between">
          <Link href="/dashboard/check-in">
            Check in / out <ArrowRight className="size-4" />
          </Link>
        </Button>
        {rbac.canSuperviseFloor ? (
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/attendance/live">
              Live on site <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/incidents">
              Incidents <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
