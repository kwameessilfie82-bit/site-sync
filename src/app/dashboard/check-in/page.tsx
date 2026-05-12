import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
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
    .select("org_id, person_id")
    .eq("id", user!.id)
    .single();

  const orgId = profile!.org_id!;

  const { data: projects } = await supabase.from("projects").select("id").eq("org_id", orgId);

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: sites } =
    projectIds.length > 0
      ? await supabase
          .from("sites")
          .select("id, name, project:projects(name)")
          .in("project_id", projectIds)
          .order("name")
      : { data: [] as { id: string; name: string; project: { name: string } | null }[] };

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

  const siteOptions = (sites ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    project: embedOne(
      s.project as unknown as { name: string } | { name: string }[] | null,
    ),
  }));

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Check in / out</CardTitle>
          <CardDescription>
            Use a site QR link for stronger verification, or pick a site manually. Geofence requires
            GPS when the site has a radius set.
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
        <CheckInForm sites={siteOptions} openSessionId={openSessionId} />
      </Suspense>
    </div>
  );
}
