import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { CheckInForm } from "@/app/dashboard/check-in/check-in-form";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Check in / out</h1>
        <p className="text-sm text-muted-foreground">
          Use a site QR link for stronger verification, or pick a site manually. Geofence requires GPS when the site has a radius set.
        </p>
      </div>
      {!profile!.person_id && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          Your login is not linked to a person yet. An owner or PM can link you under{" "}
          <strong>Team accounts</strong>.
        </p>
      )}
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <CheckInForm sites={siteOptions} openSessionId={openSessionId} />
      </Suspense>
    </div>
  );
}
