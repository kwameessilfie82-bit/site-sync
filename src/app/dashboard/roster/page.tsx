import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { createRosterAssignment } from "@/actions/roster";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";

export default async function RosterPage() {
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

  const { data: assignments } = await supabase
    .from("roster_assignments")
    .select(
      "id, valid_from, valid_to, person:people(full_name), project:projects(name)",
    )
    .eq("org_id", orgId)
    .order("valid_from", { ascending: false })
    .limit(100);

  const { data: people } = await supabase
    .from("people")
    .select("id, full_name")
    .eq("org_id", orgId)
    .order("full_name");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name");

  const canManage = ["owner", "pm", "supervisor"].includes(profile!.role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roster</h1>
        <p className="text-sm text-muted-foreground">
          Who is authorized on which project over a date range (planning vs attendance).
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createRosterAssignment} className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="project_id">Project</Label>
                <NativeSelect name="project_id" id="project_id" required className="w-full max-w-md">
                  {(projects ?? []).map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_from">Valid from</Label>
                <Input id="valid_from" name="valid_from" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_to">Valid to (optional)</Label>
                <Input id="valid_to" name="valid_to" type="date" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <ul className="divide-y rounded-xl border">
        {(assignments ?? []).map((a) => {
          const person = embedOne(
            a.person as unknown as { full_name: string } | { full_name: string }[] | null,
          );
          const project = embedOne(
            a.project as unknown as { name: string } | { name: string }[] | null,
          );
          return (
            <li key={a.id} className="px-4 py-3 text-sm">
              <span className="font-medium">{person?.full_name ?? "—"}</span>
              <span className="text-muted-foreground"> → {project?.name ?? "—"}</span>
              <p className="text-xs text-muted-foreground">
                {a.valid_from}
                {a.valid_to ? ` – ${a.valid_to}` : " · open-ended"}
              </p>
            </li>
          );
        })}
        {assignments?.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">No roster rows yet.</li>
        )}
      </ul>
    </div>
  );
}
