"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

export async function createSite(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return;
  if (!["owner", "pm", "supervisor"].includes(profile.role)) return;

  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) return;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("org_id", profile.org_id)
    .single();

  if (!project) return;

  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();
  const radiusRaw = String(formData.get("geofence_radius_m") ?? "").trim();

  const latitude = latRaw ? Number(latRaw) : null;
  const longitude = lngRaw ? Number(lngRaw) : null;
  const geofence_radius_m = radiusRaw ? Number(radiusRaw) : null;

  const { data: site, error } = await supabase
    .from("sites")
    .insert({
      project_id: projectId,
      name,
      latitude: Number.isFinite(latitude as number) ? latitude : null,
      longitude: Number.isFinite(longitude as number) ? longitude : null,
      geofence_radius_m:
        geofence_radius_m != null && Number.isFinite(geofence_radius_m)
          ? geofence_radius_m
          : null,
    })
    .select("id")
    .single();

  if (error || !site) return;

  const token = randomBytes(24).toString("base64url");
  await supabase.from("site_check_in_tokens").insert({
    site_id: site.id,
    token,
    label: "default",
  });

  await logAudit(supabase, profile.org_id, profile.id, "create", "site", site.id, {
    name,
    projectId,
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}
