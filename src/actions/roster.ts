"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { rosterRowIsActive, todayYmdUtc } from "@/lib/project-assignment";

export async function addPersonToProject(formData: FormData): Promise<void> {
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

  const personId = String(formData.get("person_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const validFromRaw = String(formData.get("valid_from") ?? "").trim();
  const validToRaw = String(formData.get("valid_to") ?? "").trim();

  if (!personId || !projectId) return;

  const validFrom = validFromRaw || todayYmdUtc();
  const validTo = validToRaw || null;

  const { data: person } = await supabase
    .from("people")
    .select("id")
    .eq("id", personId)
    .eq("org_id", profile.org_id)
    .single();

  if (!person) return;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("org_id", profile.org_id)
    .single();

  if (!project) return;

  const today = todayYmdUtc();
  const { data: existingRows } = await supabase
    .from("roster_assignments")
    .select("id, valid_from, valid_to")
    .eq("person_id", personId)
    .eq("project_id", projectId);

  if ((existingRows ?? []).some((r) => rosterRowIsActive({ valid_from: r.valid_from, valid_to: r.valid_to }, today))) {
    return;
  }

  const { error } = await supabase.from("roster_assignments").insert({
    org_id: profile.org_id,
    person_id: personId,
    project_id: projectId,
    valid_from: validFrom,
    valid_to: validTo,
  });

  if (error) return;

  await logAudit(supabase, profile.org_id, profile.id, "create", "roster_assignment", null, {
    personId,
    projectId,
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/field-logs");
  revalidatePath("/dashboard/check-in");
  revalidatePath("/dashboard/awaiting-project");
}

export async function removePersonFromProject(formData: FormData): Promise<void> {
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

  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!assignmentId || !projectId) return;

  const { data: row } = await supabase
    .from("roster_assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("project_id", projectId)
    .eq("org_id", profile.org_id)
    .maybeSingle();

  if (!row) return;

  const { error } = await supabase.from("roster_assignments").delete().eq("id", assignmentId).eq("org_id", profile.org_id);

  if (error) return;

  await logAudit(supabase, profile.org_id, profile.id, "delete", "roster_assignment", assignmentId, { projectId });

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/field-logs");
  revalidatePath("/dashboard/check-in");
  revalidatePath("/dashboard/awaiting-project");
}
