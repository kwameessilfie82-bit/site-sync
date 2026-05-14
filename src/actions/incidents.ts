"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type CreateIncidentState = { error?: string; ok?: true };

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function safeFileName(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
  return s || "image";
}

export async function createIncident(formData: FormData): Promise<CreateIncidentState> {
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

  if (!profile?.org_id) return { error: "No organization." };
  if (profile.role === "owner") {
    return { error: "Owners review incidents from the list; field staff submit new reports." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const description = String(formData.get("description") ?? "").trim();
  const severityRaw = String(formData.get("severity") ?? "low").toLowerCase();
  const severity = ["low", "medium", "high"].includes(severityRaw) ? severityRaw : "low";
  const projectId = String(formData.get("project_id") ?? "").trim() || null;

  const photoField = formData.get("photo");
  const file = photoField instanceof File && photoField.size > 0 ? photoField : null;

  if (severity === "high" && !file) {
    return { error: "High severity incidents require a photo." };
  }

  if (file) {
    if (file.size > MAX_PHOTO_BYTES) return { error: "Photo must be 5 MB or smaller." };
    if (!file.type.startsWith("image/")) return { error: "Photo must be an image file." };
  }

  if (projectId) {
    const { data: p } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("org_id", profile.org_id)
      .maybeSingle();
    if (!p) return { error: "Invalid project." };
  }

  const { data: row, error } = await supabase
    .from("incidents")
    .insert({
      org_id: profile.org_id,
      title,
      description,
      severity,
      project_id: projectId,
      reported_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !row) return { error: error?.message ?? "Could not save incident." };

  if (file) {
    const path = `${profile.org_id}/${row.id}/${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("incident-photos").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) {
      await supabase.from("incidents").delete().eq("id", row.id).eq("org_id", profile.org_id);
      return { error: upErr.message };
    }
    const { error: pathErr } = await supabase
      .from("incidents")
      .update({ photo_storage_path: path })
      .eq("id", row.id)
      .eq("org_id", profile.org_id);
    if (pathErr) {
      await supabase.storage.from("incident-photos").remove([path]);
      await supabase.from("incidents").delete().eq("id", row.id).eq("org_id", profile.org_id);
      return { error: pathErr.message };
    }
  }

  await logAudit(supabase, profile.org_id, profile.id, "create", "incident", row.id, { title });

  revalidatePath("/dashboard/incidents");
  revalidatePath(`/dashboard/incidents/${row.id}`);
  return { ok: true };
}
