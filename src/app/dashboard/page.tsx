import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card";
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
    .select("org_id")
    .eq("id", user!.id)
    .single();

  const orgId = profile!.org_id!;

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
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <Badge variant="secondary" className="mb-3">
          Operations Dashboard
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live snapshot of projects, workforce coverage, and accountability status.
        </p>
      </div>
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
        <Button asChild className="justify-between">
          <Link href="/dashboard/projects">
            Manage projects <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href="/dashboard/check-in">
            Check in / out <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href="/dashboard/attendance/live">
            Live on site <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
