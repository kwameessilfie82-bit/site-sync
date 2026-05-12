import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSite } from "@/actions/sites";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_name")
    .eq("id", projectId)
    .eq("org_id", profile!.org_id!)
    .single();

  if (!project) notFound();

  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, latitude, longitude, geofence_radius_m")
    .eq("project_id", projectId)
    .order("name");

  const siteIds = (sites ?? []).map((s) => s.id);
  const { data: tokens } =
    siteIds.length > 0
      ? await supabase.from("site_check_in_tokens").select("id, site_id, token, is_active").in("site_id", siteIds)
      : { data: [] as { id: string; site_id: string; token: string; is_active: boolean }[] };

  const tokenBySite = new Map((tokens ?? []).map((t) => [t.site_id, t]));

  const canManage = ["owner", "pm", "supervisor"].includes(profile!.role);
  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ??
    (typeof process.env.VERCEL_URL === "string"
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/projects" className="hover:underline">
              Projects
            </Link>
            <span className="mx-1">/</span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.client_name && (
            <p className="text-sm text-muted-foreground">Client: {project.client_name}</p>
          )}
        </div>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add site</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSite} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="project_id" value={projectId} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Site name</Label>
                <Input id="name" name="name" required placeholder="Main laydown / Gate A" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude (optional)</Label>
                <Input id="latitude" name="latitude" placeholder="0.3476" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude (optional)</Label>
                <Input id="longitude" name="longitude" placeholder="32.5825" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="geofence_radius_m">Geofence radius (m, optional)</Label>
                <Input id="geofence_radius_m" name="geofence_radius_m" placeholder="200" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Create site & check-in link</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-medium">Sites</h2>
        <ul className="space-y-3">
          {(sites ?? []).map((s) => {
            const tok = tokenBySite.get(s.id);
            const checkInUrl = tok
              ? `${origin}/dashboard/check-in?site=${s.id}&token=${encodeURIComponent(tok.token)}`
              : `${origin}/dashboard/check-in?site=${s.id}`;
            return (
              <li key={s.id} className="rounded-xl border p-4">
                <div className="font-medium">{s.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.latitude != null && s.longitude != null
                    ? `${s.latitude}, ${s.longitude}`
                    : "No map pin"}
                  {s.geofence_radius_m != null ? ` · ${s.geofence_radius_m}m geofence` : ""}
                </p>
                {tok && (
                  <p className="mt-2 break-all text-xs font-mono text-muted-foreground">
                    Check-in URL: {checkInUrl}
                  </p>
                )}
              </li>
            );
          })}
          {sites?.length === 0 && (
            <p className="text-sm text-muted-foreground">No sites yet. Add one above.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
