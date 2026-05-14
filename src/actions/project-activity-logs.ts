"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { employeeMayAccessProject } from "@/lib/field-log-access";

export type SubmitActivityLogState = { error?: string; ok?: true };

export async function submitProjectActivityLog(
  formData: FormData,
): Promise<SubmitActivityLogState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, id, person_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return { error: "No organization." };

  const projectId = String(formData.get("project_id") ?? "").trim();
  const logSheetId = String(formData.get("log_sheet_id") ?? "").trim();
  if (!projectId || !logSheetId) return { error: "Missing project or activity." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, name, client_name")
    .eq("id", projectId)
    .eq("org_id", profile.org_id)
    .single();

  if (!project) return { error: "Project not found." };

  const { data: sheet } = await supabase
    .from("project_log_sheets")
    .select("id, project_id")
    .eq("id", logSheetId)
    .eq("project_id", projectId)
    .single();

  if (!sheet) return { error: "Activity not found for this project." };

  const { data: columns } = await supabase
    .from("project_log_sheet_columns")
    .select("column_key, label")
    .eq("log_sheet_id", logSheetId)
    .order("sort_order");

  const clientName = String(formData.get("client_name") ?? "").trim();
  const workLocation = String(formData.get("work_location") ?? "").trim();
  const logDateRaw = String(formData.get("log_date") ?? "").trim();
  const geomMaterial = String(formData.get("geomembrane_material") ?? "").trim();
  const geomThickness = String(formData.get("geomembrane_thickness") ?? "").trim();
  const geomTexture = String(formData.get("geomembrane_texture") ?? "").trim();

  if (!clientName) return { error: "Client is required." };
  if (!workLocation) return { error: "Location is required." };
  if (!logDateRaw) return { error: "Date is required." };
  if (!geomMaterial || !geomThickness || !geomTexture) {
    return { error: "Geomembrane material, thickness, and texture are required." };
  }

  const logDateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!logDateRe.test(logDateRaw)) {
    return { error: "Invalid log date." };
  }

  if (profile.role === "employee" || profile.role === "worker") {
    if (!profile.person_id) {
      return {
        error:
          "Your account is not linked to a person record. Ask an owner or PM to link you under Team accounts.",
      };
    }
    const allowed = await employeeMayAccessProject(supabase, profile.person_id, projectId);
    if (!allowed) {
      return {
        error:
          "You are not assigned to this project yet. Your manager adds people on the project page — ask them to include you.",
      };
    }
    const dayStart = `${logDateRaw}T00:00:00.000Z`;
    const [y, m, d] = logDateRaw.split("-").map(Number);
    const nextUtc = new Date(Date.UTC(y, m - 1, d));
    nextUtc.setUTCDate(nextUtc.getUTCDate() + 1);
    const nextYmd = nextUtc.toISOString().slice(0, 10);
    const dayEndExclusive = `${nextYmd}T00:00:00.000Z`;

    const { data: clocked } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("person_id", profile.person_id)
      .eq("project_id", projectId)
      .gte("clock_in_at", dayStart)
      .lt("clock_in_at", dayEndExclusive)
      .maybeSingle();

    if (!clocked) {
      return {
        error:
          "Clock in on this project for that calendar day (UTC) before submitting this field log.",
      };
    }
  }

  const customValues: Record<string, string> = {};
  for (const col of columns ?? []) {
    const v = String(formData.get(`custom_${col.column_key}`) ?? "").trim();
    if (!v) return { error: `Please fill in: ${col.label}` };
    customValues[col.column_key] = v;
  }

  const { error } = await supabase.from("project_activity_logs").insert({
    org_id: profile.org_id,
    project_id: projectId,
    log_sheet_id: logSheetId,
    author_profile_id: profile.id,
    author_person_id: profile.person_id,
    client_name: clientName,
    work_location: workLocation,
    log_date: logDateRaw,
    geomembrane_material: geomMaterial,
    geomembrane_thickness: geomThickness,
    geomembrane_texture: geomTexture,
    custom_values: customValues,
  });

  if (error) return { error: error.message };

  await logAudit(supabase, profile.org_id, profile.id, "create", "project_activity_log", null, {
    projectId,
    logSheetId,
  });

  revalidatePath("/dashboard/field-logs");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { ok: true };
}
