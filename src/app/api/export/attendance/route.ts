import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { data: rows, error } = await supabase
    .from("attendance_sessions")
    .select(
      "clock_in_at, clock_out_at, method, person:people(full_name), site:sites(name, project:projects(name))",
    )
    .eq("org_id", profile.org_id)
    .order("clock_in_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = ["person", "project", "site", "clock_in_at", "clock_out_at", "method"];
  const lines = [header.join(",")];

  for (const r of rows ?? []) {
    const person = embedOne(
      r.person as unknown as { full_name: string } | { full_name: string }[] | null,
    );
    const site = embedOne(
      r.site as unknown as {
        name: string;
        project: { name: string } | { name: string }[] | null;
      } | null,
    );
    const project = embedOne(site?.project ?? null);
    const proj = project?.name ?? "";
    const cells = [
      person?.full_name ?? "",
      proj,
      site?.name ?? "",
      r.clock_in_at,
      r.clock_out_at ?? "",
      r.method,
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
    lines.push(cells.join(","));
  }

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="attendance-export.csv"',
    },
  });
}
