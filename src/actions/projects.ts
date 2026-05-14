"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { isProjectGeofenceColumnError } from "@/lib/project-geofence-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const LEADS = ["owner", "pm", "supervisor"] as const;

const GEOFENCE_COLUMNS_HINT =
  "Work zone columns are not in the database yet. Run npm run db:migrate from the project root (DATABASE_URL must point at Postgres port 5432 for DDL, not the 6543 pooler), then save again.";

function mapProjectSiteDbError(message: string | undefined): string {
  if (isProjectGeofenceColumnError(message)) return GEOFENCE_COLUMNS_HINT;
  return message?.trim() || "Could not update the project.";
}

function isLead(role: string): boolean {
  return LEADS.includes(role as (typeof LEADS)[number]);
}

export async function createProject(formData: FormData): Promise<void> {
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
  if (!isLead(profile.role)) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const clientName = String(formData.get("client_name") ?? "").trim() || null;
  const code = String(formData.get("code") ?? "").trim() || null;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      org_id: profile.org_id,
      name,
      client_name: clientName,
      code,
    })
    .select("id")
    .single();

  if (error || !project) return;

  await logAudit(supabase, profile.org_id, profile.id, "create", "project", project.id, {
    name,
  });

  revalidatePath("/dashboard/projects");
}

export type UpdateProjectSiteResult = { ok?: true; error?: string };

export async function updateProjectSite(formData: FormData): Promise<UpdateProjectSiteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id || !isLead(profile.role)) {
    return { error: "You do not have permission to change the work zone." };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!projectId) return { error: "Missing project." };

  const intent = String(formData.get("intent") ?? "").trim();
  if (intent === "clear") {
    const { error } = await supabase
      .from("projects")
      .update({
        site_latitude: null,
        site_longitude: null,
        site_radius_m: null,
      })
      .eq("id", projectId)
      .eq("org_id", profile.org_id);

    if (error) return { error: mapProjectSiteDbError(error.message) };

    await logAudit(supabase, profile.org_id, profile.id, "update", "project", projectId, {
      site_cleared: true,
    });
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath("/dashboard/check-in");
    return { ok: true };
  }

  const lat = Number(String(formData.get("site_latitude") ?? "").trim());
  const lng = Number(String(formData.get("site_longitude") ?? "").trim());
  const radius = Number(String(formData.get("site_radius_m") ?? "").trim());

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: "Latitude must be between -90 and 90." };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: "Longitude must be between -180 and 180." };
  }
  if (!Number.isFinite(radius) || radius < 10 || radius > 100_000) {
    return { error: "Radius must be between 10 and 100,000 meters." };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      site_latitude: lat,
      site_longitude: lng,
      site_radius_m: radius,
    })
    .eq("id", projectId)
    .eq("org_id", profile.org_id);

  if (error) return { error: mapProjectSiteDbError(error.message) };

  await logAudit(supabase, profile.org_id, profile.id, "update", "project", projectId, {
    site_latitude: lat,
    site_longitude: lng,
    site_radius_m: radius,
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/check-in");
  return { ok: true };
}

export async function setProjectActive(formData: FormData): Promise<void> {
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

  if (!profile?.org_id || !isLead(profile.role)) return;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const active = String(formData.get("is_active") ?? "") === "true";
  if (!projectId) return;

  const { error } = await supabase
    .from("projects")
    .update({ is_active: active })
    .eq("id", projectId)
    .eq("org_id", profile.org_id);

  if (error) return;

  await logAudit(supabase, profile.org_id, profile.id, "update", "project", projectId, {
    is_active: active,
  });

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function deleteProject(formData: FormData): Promise<void> {
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

  if (!profile?.org_id || !isLead(profile.role)) return;

  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!projectId) return;

  const { data: proj } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("org_id", profile.org_id)
    .single();

  if (!proj) return;

  await supabase.from("project_activity_logs").delete().eq("project_id", projectId);
  await supabase.from("project_log_sheets").delete().eq("project_id", projectId);
  await supabase.from("roster_assignments").delete().eq("project_id", projectId);
  await supabase.from("attendance_sessions").delete().eq("project_id", projectId);
  await supabase.from("incidents").update({ project_id: null }).eq("project_id", projectId);

  const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("org_id", profile.org_id);

  if (error) return;

  await logAudit(supabase, profile.org_id, profile.id, "delete", "project", projectId, { name: proj.name });

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/field-logs");
  revalidatePath("/dashboard/check-in");
  revalidatePath("/dashboard/awaiting-project");
  redirect("/dashboard/projects");
}
