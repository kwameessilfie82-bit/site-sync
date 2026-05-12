"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createRosterAssignment(formData: FormData): Promise<void> {
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

  const personId = String(formData.get("person_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const validFrom = String(formData.get("valid_from") ?? "");
  const validToRaw = String(formData.get("valid_to") ?? "").trim();

  if (!personId || !projectId || !validFrom) return;

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

  const { error } = await supabase.from("roster_assignments").insert({
    org_id: profile.org_id,
    person_id: personId,
    project_id: projectId,
    valid_from: validFrom,
    valid_to: validToRaw || null,
  });

  if (error) return;

  await logAudit(supabase, profile.org_id, profile.id, "create", "roster_assignment", null, {
    personId,
    projectId,
  });

  revalidatePath("/dashboard/roster");
}
