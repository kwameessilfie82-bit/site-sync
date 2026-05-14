import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadProjectsForFieldLogs } from "@/lib/field-log-access";
import { isProjectGeofenceColumnError } from "@/lib/project-geofence-error";
import type { UserRole } from "@/types/database";
import { CheckInForm } from "@/app/dashboard/check-in/check-in-form";
import { Alert, AlertDescription, AlertTitle } from "@/ui/primitives/alert";
import { Button } from "@/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { AlertTriangle } from "lucide-react";

export default async function CheckInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, person_id, role")
    .eq("id", user!.id)
    .single();

  const orgId = profile!.org_id!;
  const role = profile!.role as UserRole;

  let projects: {
    id: string;
    name: string;
    site_latitude: number | null;
    site_longitude: number | null;
    site_radius_m: number | null;
  }[] = [];

  if (role === "employee" || role === "worker") {
    const assigned = await loadProjectsForFieldLogs(supabase, orgId, role, profile!.person_id);
    const ids = assigned.map((p) => p.id);
    if (ids.length > 0) {
      const geoSel = "id, name, site_latitude, site_longitude, site_radius_m";
      const { data: rows, error: geoErr } = await supabase
        .from("projects")
        .select(geoSel)
        .in("id", ids)
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("name");
      if (geoErr && isProjectGeofenceColumnError(geoErr.message)) {
        const { data: baseRows } = await supabase
          .from("projects")
          .select("id, name")
          .in("id", ids)
          .eq("org_id", orgId)
          .eq("is_active", true)
          .order("name");
        projects = (baseRows ?? []).map((p) => ({
          ...p,
          site_latitude: null,
          site_longitude: null,
          site_radius_m: null,
        }));
      } else {
        projects = rows ?? [];
      }
    }
  } else {
    const geoSel = "id, name, site_latitude, site_longitude, site_radius_m";
    const { data: rows, error: geoErr } = await supabase
      .from("projects")
      .select(geoSel)
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("name");
    if (geoErr && isProjectGeofenceColumnError(geoErr.message)) {
      const { data: baseRows } = await supabase
        .from("projects")
        .select("id, name")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("name");
      projects = (baseRows ?? []).map((p) => ({
        ...p,
        site_latitude: null,
        site_longitude: null,
        site_radius_m: null,
      }));
    } else {
      projects = rows ?? [];
    }
  }

  const projectOptions = projects.map((p) => ({
    id: p.id,
    name: p.name,
    geofenceConfigured:
      p.site_latitude != null &&
      p.site_longitude != null &&
      p.site_radius_m != null &&
      Number.isFinite(p.site_radius_m) &&
      p.site_radius_m > 0,
  }));

  let openSessionId: string | null = null;
  if (profile!.person_id) {
    const { data: open } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("person_id", profile!.person_id)
      .is("clock_out_at", null)
      .maybeSingle();
    openSessionId = open?.id ?? null;
  }

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Check in / out</CardTitle>
          <CardDescription>
            Pick an active project. Self check-in only works once a supervisor has saved a work zone on that
            project&apos;s page and you are inside it with GPS.
          </CardDescription>
        </CardHeader>
      </Card>

      {!profile!.person_id && (
        <Alert className="border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15">
          <AlertTriangle className="text-amber-700 dark:text-amber-400" />
          <AlertTitle className="text-amber-950 dark:text-amber-100">Person record required</AlertTitle>
          <AlertDescription className="text-amber-950/90 dark:text-amber-50/90">
            Your login is not linked to a person yet. An owner or PM can link you under{" "}
            <Button variant="link" className="h-auto p-0 text-amber-950 underline dark:text-amber-50" asChild>
              <Link href="/dashboard/team">Team accounts</Link>
            </Button>
            .
          </AlertDescription>
        </Alert>
      )}

      <Suspense fallback={<Card className="animate-pulse border-dashed"><CardContent className="h-40 p-6" /></Card>}>
        <CheckInForm projects={projectOptions} openSessionId={openSessionId} />
      </Suspense>
    </div>
  );
}
