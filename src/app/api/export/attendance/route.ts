import { subDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { NextResponse } from "next/server";

function parseYmd(s: string | null, fallback: Date): string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return format(fallback, "yyyy-MM-dd");
  return s;
}

function localBounds(fromYmd: string, toYmd: string): { start: string; end: string } {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
  const end = new Date(ty, tm - 1, td, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const today = new Date();
  const fromYmd = parseYmd(searchParams.get("from"), subDays(today, 30));
  const toYmd = parseYmd(searchParams.get("to"), today);
  const { start, end } = localBounds(fromYmd, toYmd);

  const { data: rows, error } = await supabase
    .from("attendance_sessions")
    .select(
      "clock_in_at, clock_out_at, method, person:people(full_name), project:projects(name)",
    )
    .eq("org_id", profile.org_id)
    .gte("clock_in_at", start)
    .lte("clock_in_at", end)
    .order("clock_in_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = ["person", "project", "clock_in_at", "clock_out_at", "method"];
  const lines = [header.join(",")];

  for (const r of rows ?? []) {
    const person = embedOne(
      r.person as unknown as { full_name: string } | { full_name: string }[] | null,
    );
    const project = embedOne(
      r.project as unknown as { name: string } | { name: string }[] | null,
    );
    const cells = [
      person?.full_name ?? "",
      project?.name ?? "",
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
      "Content-Disposition": `attachment; filename="attendance-${fromYmd}_to_${toYmd}.csv"`,
    },
  });
}
