import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { Button } from "@/ui/primitives/button";

export default async function AttendanceLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user!.id)
    .single();

  const { data: rows } = await supabase
    .from("attendance_sessions")
    .select(
      "id, clock_in_at, clock_out_at, method, person:people(full_name), site:sites(name, project:projects(name))",
    )
    .eq("org_id", profile!.org_id!)
    .order("clock_in_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance log</h1>
          <p className="text-sm text-muted-foreground">Recent sessions across all sites.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/api/export/attendance">Download CSV</Link>
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">Person</th>
              <th className="px-3 py-2 font-medium">Site</th>
              <th className="px-3 py-2 font-medium">In</th>
              <th className="px-3 py-2 font-medium">Out</th>
              <th className="px-3 py-2 font-medium">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows ?? []).map((r) => {
              const person = embedOne(
                r.person as unknown as { full_name: string } | { full_name: string }[] | null,
              );
              const site = embedOne(
                r.site as unknown as {
                  name: string;
                  project: { name: string } | { name: string }[] | null;
                } | null,
              );
              const proj = embedOne(site?.project ?? null)?.name;
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2">{person?.full_name ?? "—"}</td>
                  <td className="px-3 py-2">
                    {proj ? `${proj} — ${site?.name}` : site?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {new Date(r.clock_in_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {r.clock_out_at ? new Date(r.clock_out_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">{r.method}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows?.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">No sessions yet.</p>
        )}
      </div>
    </div>
  );
}
