import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { supervisorClockIn, supervisorClockOut } from "@/actions/attendance";
import { Button } from "@/ui/primitives/button";
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
    .select("id, clock_in_at, person:people(full_name), project:projects(name)")
    .eq("org_id", orgId)
    .is("clock_out_at", null)
    .order("clock_in_at", { ascending: false });

  const { data: people } = await supabase
    .from("people")
    .select("id, full_name")
    .eq("org_id", orgId)
    .order("full_name");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("name");

  const canSupervise = ["owner", "pm", "supervisor"].includes(profile!.role);

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Live attendance</CardTitle>
          <CardDescription>Open sessions by project (not yet clocked out).</CardDescription>
        </CardHeader>
      </Card>

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
                <Label htmlFor="project_id">Project</Label>
                <NativeSelect name="project_id" id="project_id" required className="w-full max-w-md">
                  {(projects ?? []).map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Clock in</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {open && open.length > 0 ? (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Open sessions</CardTitle>
            <CardDescription>Crew currently clocked in.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Person</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Since</TableHead>
                  {canSupervise && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(open ?? []).map((s) => {
                  const person = embedOne(
                    s.person as unknown as { full_name: string } | { full_name: string }[] | null,
                  );
                  const project = embedOne(
                    s.project as unknown as { name: string } | { name: string }[] | null,
                  );
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{person?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{project?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {new Date(s.clock_in_at).toLocaleString()}
                      </TableCell>
                      {canSupervise && (
                        <TableCell className="text-right">
                          <form action={supervisorClockOut} className="inline">
                            <input type="hidden" name="session_id" value={s.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Clock out
                            </Button>
                          </form>
                        </TableCell>
                      )}
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
            <EmptyTitle>Nobody clocked in</EmptyTitle>
            <EmptyDescription>Open attendance sessions will appear here in real time.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
