"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { allocateColumnKey } from "@/lib/column-key";
import { revalidatePath } from "next/cache";

const LEADS = ["owner", "pm", "supervisor"] as const;

async function assertLeadProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: { org_id: string; id: string; role: string },
  projectId: string,
): Promise<boolean> {
  if (!LEADS.includes(profile.role as (typeof LEADS)[number])) return false;
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("org_id", profile.org_id)
    .maybeSingle();
  return !!project;
}

export async function createProjectLogSheet(formData: FormData): Promise<void> {
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

  const projectId = String(formData.get("project_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) return;
  if (!(await assertLeadProject(supabase, profile, projectId))) return;

  const { data: row, error } = await supabase
    .from("project_log_sheets")
    .insert({ project_id: projectId, name })
    .select("id")
    .single();

  if (error || !row) return;

  await logAudit(supabase, profile.org_id, profile.id, "create", "project_log_sheet", row.id, {
    projectId,
    name,
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addLogSheetColumn(formData: FormData): Promise<void> {
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

  const logSheetId = String(formData.get("log_sheet_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  if (!logSheetId || !label) return;

  const { data: sheet } = await supabase
    .from("project_log_sheets")
    .select("id, project_id")
    .eq("id", logSheetId)
    .single();

  if (!sheet) return;
  if (!(await assertLeadProject(supabase, profile, sheet.project_id))) return;

  const { data: cols } = await supabase
    .from("project_log_sheet_columns")
    .select("column_key, sort_order")
    .eq("log_sheet_id", logSheetId);

  const existing = new Set((cols ?? []).map((c) => c.column_key));
  const columnKey = allocateColumnKey(label, existing);
  const sortOrder =
    cols && cols.length > 0 ? Math.max(...cols.map((c) => c.sort_order), 0) + 1 : 0;

  const { error } = await supabase.from("project_log_sheet_columns").insert({
    log_sheet_id: logSheetId,
    column_key: columnKey,
    label,
    sort_order: sortOrder,
  });

  if (error) return;

  await logAudit(supabase, profile.org_id, profile.id, "create", "project_log_sheet_column", null, {
    logSheetId,
    label,
    columnKey,
  });

  revalidatePath(`/dashboard/projects/${sheet.project_id}`);
}

export async function deleteProjectLogSheet(logSheetId: string): Promise<{ error?: string }> {
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

  const { data: sheet } = await supabase
    .from("project_log_sheets")
    .select("id, project_id")
    .eq("id", logSheetId)
    .single();

  if (!sheet) return { error: "Not found." };
  if (!(await assertLeadProject(supabase, profile, sheet.project_id))) {
    return { error: "Not allowed." };
  }

  const { error } = await supabase.from("project_log_sheets").delete().eq("id", logSheetId);

  if (error) {
    if (error.code === "23503" || error.message.toLowerCase().includes("foreign key")) {
      return { error: "Delete existing log entries for this activity first, then try again." };
    }
    return { error: error.message };
  }

  await logAudit(supabase, profile.org_id, profile.id, "delete", "project_log_sheet", logSheetId, {});

  revalidatePath(`/dashboard/projects/${sheet.project_id}`);
  return {};
}

export async function deleteLogSheetColumn(columnId: string): Promise<void> {
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

  const { data: col } = await supabase
    .from("project_log_sheet_columns")
    .select("id, log_sheet_id")
    .eq("id", columnId)
    .single();

  if (!col) return;

  const { data: sheet } = await supabase
    .from("project_log_sheets")
    .select("project_id")
    .eq("id", col.log_sheet_id)
    .single();

  if (!sheet) return;
  if (!(await assertLeadProject(supabase, profile, sheet.project_id))) return;

  await supabase.from("project_log_sheet_columns").delete().eq("id", columnId);

  await logAudit(supabase, profile.org_id, profile.id, "delete", "project_log_sheet_column", columnId, {});

  revalidatePath(`/dashboard/projects/${sheet.project_id}`);
}
