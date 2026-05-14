import { addPersonToProject, removePersonFromProject } from "@/actions/roster";
import { embedOne } from "@/lib/supabase/embed";
import { todayYmdUtc } from "@/lib/project-assignment";
import { Button } from "@/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/primitives/table";

export type RosterDbRow = {
  id: string;
  person_id: string;
  valid_from: string;
  valid_to: string | null;
  person: unknown;
};

export type PersonOpt = { id: string; full_name: string };

export function ProjectTeamCard({
  projectId,
  canManage,
  rosterRows,
  candidatePeople,
}: {
  projectId: string;
  canManage: boolean;
  rosterRows: RosterDbRow[];
  candidatePeople: PersonOpt[];
}) {
  const today = todayYmdUtc();
  const assignments = rosterRows.filter(
    (r) => r.valid_from <= today && (r.valid_to == null || r.valid_to >= today),
  );

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">People on this project</CardTitle>
        <CardDescription>
          {canManage
            ? "Employees (and others in your directory) only see field logs and check-in for projects listed here. Dates control when the assignment is active."
            : "Team members assigned to this project for field logs and attendance."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "No one is assigned yet. Add people from your organization below."
              : "No active assignments for this project."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((r) => {
                const person = embedOne(
                  r.person as { full_name: string } | { full_name: string }[] | null,
                );
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{person?.full_name ?? "—"}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{r.valid_from}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{r.valid_to ?? "—"}</TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <form action={removePersonFromProject} className="inline">
                          <input type="hidden" name="assignment_id" value={r.id} />
                          <input type="hidden" name="project_id" value={projectId} />
                          <Button type="submit" variant="outline" size="sm">
                            Remove
                          </Button>
                        </form>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {canManage ? (
          <form action={addPersonToProject} className="space-y-4 border-t pt-6">
            <input type="hidden" name="project_id" value={projectId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="person_id">Add person</Label>
                <NativeSelect id="person_id" name="person_id" required className="w-full max-w-md">
                  {candidatePeople.map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.full_name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {candidatePeople.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Everyone in your directory is already on this project, or there are no people yet — use{" "}
                    <span className="font-medium text-foreground">Invites & people</span> first.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_from">Active from</Label>
                <Input id="valid_from" name="valid_from" type="date" defaultValue={today} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_to">Active until (optional)</Label>
                <Input id="valid_to" name="valid_to" type="date" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={candidatePeople.length === 0}>
                  Add to project
                </Button>
              </div>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
