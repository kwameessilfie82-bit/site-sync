import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { supervisorClockIn, supervisorClockOut } from "@/actions/attendance";
import { Button } from "@/ui/primitives/button";
import { Label } from "@/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";

export default async function LiveAttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  const orgId = profile!.org_id!;

  const { data: open } = await supabase
    .from("attendance_sessions")
    .select(
      "id, clock_in_at, person:people(full_name), site:sites(name, project:projects(name))",
    )
    .eq("org_id", orgId)
    .is("clock_out_at", null)
    .order("clock_in_at", { ascending: false });

  const { data: people } = await supabase
    .from("people")
    .select("id, full_name")
    .eq("org_id", orgId)
    .order("full_name");

  const { data: projects } = await supabase.from("projects").select("id").eq("org_id", orgId);
  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: sites } =
    projectIds.length > 0
      ? await supabase
          .from("sites")
          .select("id, name, project:projects(name)")
          .in("project_id", projectIds)
          .order("name")
      : { data: [] as { id: string; name: string; project: { name: string } | null }[] };

  const canSupervise = ["owner", "pm", "supervisor"].includes(profile!.role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live on site</h1>
        <p className="text-sm text-muted-foreground">Open sessions (not yet clocked out).</p>
      </div>

      {canSupervise && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supervisor: clock someone in</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={supervisorClockIn} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="person_id">Person</Label>
                <NativeSelect name="person_id" id="person_id" required className="w-full max-w-md">
                  {(people ?? []).map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.full_name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_id">Site</Label>
                <NativeSelect name="site_id" id="site_id" required className="w-full max-w-md">
                  {(sites ?? []).map((s) => {
                    const proj = embedOne(
                      s.project as unknown as { name: string } | { name: string }[] | null,
                    );
                    return (
                      <NativeSelectOption key={s.id} value={s.id}>
                        {proj ? `${proj.name} — ${s.name}` : s.name}
                      </NativeSelectOption>
                    );
                  })}
                </NativeSelect>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Clock in</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <ul className="divide-y rounded-xl border">
        {(open ?? []).map((s) => {
          const person = embedOne(
            s.person as unknown as { full_name: string } | { full_name: string }[] | null,
          );
          const site = embedOne(
            s.site as unknown as {
              name: string;
              project: { name: string } | { name: string }[] | null;
            } | null,
          );
          const proj = embedOne(site?.project ?? null)?.name;
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-medium">{person?.full_name ?? "—"}</div>
                <p className="text-xs text-muted-foreground">
                  {proj ? `${proj} — ${site?.name}` : (site?.name ?? "—")} · since{" "}
                  {new Date(s.clock_in_at).toLocaleString()}
                </p>
              </div>
              {canSupervise && (
                <form action={supervisorClockOut}>
                  <input type="hidden" name="session_id" value={s.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Clock out
                  </Button>
                </form>
              )}
            </li>
          );
        })}
        {open?.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nobody clocked in.</li>
        )}
      </ul>
    </div>
  );
}
