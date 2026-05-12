"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createIncident(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim();
  const severity = String(formData.get("severity") ?? "low").toLowerCase();
  const projectId = String(formData.get("project_id") ?? "").trim() || null;
  const siteId = String(formData.get("site_id") ?? "").trim() || null;

  if (projectId) {
    const { data: p } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("org_id", profile.org_id)
      .maybeSingle();
    if (!p) return;
  }

  if (siteId) {
    const { data: s } = await supabase
      .from("sites")
      .select("id, project_id")
      .eq("id", siteId)
      .maybeSingle();
    if (!s) return;
    const { data: p } = await supabase
      .from("projects")
      .select("org_id")
      .eq("id", s.project_id)
      .single();
    if (!p || p.org_id !== profile.org_id) return;
  }

  const { data: row, error } = await supabase
    .from("incidents")
    .insert({
      org_id: profile.org_id,
      title,
      description,
      severity: ["low", "medium", "high"].includes(severity) ? severity : "low",
      project_id: projectId,
      site_id: siteId,
      reported_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !row) return;

  await logAudit(supabase, profile.org_id, profile.id, "create", "incident", row.id, { title });

  revalidatePath("/dashboard/incidents");
}
