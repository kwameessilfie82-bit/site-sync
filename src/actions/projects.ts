"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

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
  if (!["owner", "pm", "supervisor"].includes(profile.role)) return;

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
