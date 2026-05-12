import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { createRosterAssignment } from "@/actions/roster";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/ui/primitives/empty";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/primitives/table";

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
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Roster</CardTitle>
          <CardDescription>
            Who is authorized on which project over a date range (planning vs attendance).
          </CardDescription>
        </CardHeader>
      </Card>

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

      {assignments && assignments.length > 0 ? (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Assignments</CardTitle>
            <CardDescription>Recent roster rows (latest 100).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Person</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Valid from</TableHead>
                  <TableHead>Valid to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => {
                  const person = embedOne(
                    a.person as unknown as { full_name: string } | { full_name: string }[] | null,
                  );
                  const project = embedOne(
                    a.project as unknown as { name: string } | { name: string }[] | null,
                  );
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{person?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{project?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{a.valid_from}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {a.valid_to ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyTitle>No roster rows yet</EmptyTitle>
            <EmptyDescription>Add assignments above to plan who belongs on each project.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
