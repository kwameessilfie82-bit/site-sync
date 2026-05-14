import { createClient } from "@/lib/supabase/server";
import { FIELD_LEAD_ROLES } from "@/lib/rbac";
import type { UserRole } from "@/types/database";
import { NextResponse } from "next/server";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function safeFilePart(s: string): string {
  const t = s.trim().replace(/[^\w\d\-]+/g, "_").replace(/^_+|_+$/g, "");
  return t.slice(0, 48) || "log-sheet";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? "";
  const logSheetId = searchParams.get("logSheetId")?.trim() ?? "";
  if (!projectId || !logSheetId) {
    return NextResponse.json({ error: "Missing projectId or logSheetId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  if (!FIELD_LEAD_ROLES.includes(profile.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("org_id", profile.org_id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: sheet } = await supabase
    .from("project_log_sheets")
    .select("id, name, project_id")
    .eq("id", logSheetId)
    .eq("project_id", projectId)
    .single();

  if (!sheet) {
    return NextResponse.json({ error: "Log sheet not found" }, { status: 404 });
  }

  const { data: columns } = await supabase
    .from("project_log_sheet_columns")
    .select("column_key, label, sort_order")
    .eq("log_sheet_id", logSheetId)
    .order("sort_order");

  const sortedCols = [...(columns ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  const { data: logs, error } = await supabase
    .from("project_activity_logs")
    .select(
      "created_at, client_name, work_location, log_date, geomembrane_material, geomembrane_thickness, geomembrane_texture, custom_values, author_profile_id",
    )
    .eq("log_sheet_id", logSheetId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20_000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const authorIds = [...new Set((logs ?? []).map((r) => r.author_profile_id))];
  const { data: authors } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", authorIds)
      : { data: [] as { id: string; display_name: string }[] };

  const authorMap = new Map((authors ?? []).map((a) => [a.id, a.display_name]));

  const fixedHeaders = [
    "submitted_at",
    "submitted_by",
    "client",
    "location",
    "log_date",
    "geomembrane_material",
    "geomembrane_thickness",
    "geomembrane_texture",
  ];
  const dynamicHeaders = sortedCols.map((c) => c.label.replace(/\r?\n/g, " ").trim() || c.column_key);
  const lines: string[] = [[...fixedHeaders, ...dynamicHeaders].map(csvCell).join(",")];

  for (const row of logs ?? []) {
    const cv = (row.custom_values ?? {}) as Record<string, unknown>;
    const dynamicCells = sortedCols.map((c) => {
      const v = cv[c.column_key];
      return v == null ? "" : String(v);
    });
    const cells = [
      row.created_at,
      authorMap.get(row.author_profile_id) ?? row.author_profile_id,
      row.client_name,
      row.work_location,
      row.log_date,
      row.geomembrane_material,
      row.geomembrane_thickness,
      row.geomembrane_texture,
      ...dynamicCells,
    ];
    lines.push(cells.map(csvCell).join(","));
  }

  const csv = `\uFEFF${lines.join("\n")}`;
  const fname = `${safeFilePart(project.name)}__${safeFilePart(sheet.name)}__${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
