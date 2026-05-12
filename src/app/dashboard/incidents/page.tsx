import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { createIncident } from "@/actions/incidents";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Textarea } from "@/ui/primitives/textarea";
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
import { Badge } from "@/ui/primitives/badge";

export default async function IncidentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user!.id)
    .single();

  const orgId = profile!.org_id!;

  const { data: list } = await supabase
    .from("incidents")
    .select("id, title, severity, created_at, project:projects(name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: projects } = await supabase.from("projects").select("id, name").eq("org_id", orgId);
  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: sites } =
    projectIds.length > 0
      ? await supabase.from("sites").select("id, name, project_id").in("project_id", projectIds)
      : { data: [] as { id: string; name: string; project_id: string }[] };

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Incidents</CardTitle>
          <CardDescription>Theft, damage, near-miss — tied to org audit trail.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report incident</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createIncident} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Missing welding unit" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} placeholder="What happened, when, witnesses…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <NativeSelect name="severity" id="severity" defaultValue="low" className="w-full max-w-xs">
                <NativeSelectOption value="low">Low</NativeSelectOption>
                <NativeSelectOption value="medium">Medium</NativeSelectOption>
                <NativeSelectOption value="high">High</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_id">Project (optional)</Label>
              <NativeSelect name="project_id" id="project_id" className="w-full max-w-md" defaultValue="">
                <NativeSelectOption value="">—</NativeSelectOption>
                {(projects ?? []).map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="site_id">Site (optional)</Label>
              <NativeSelect name="site_id" id="site_id" className="w-full max-w-md" defaultValue="">
                <NativeSelectOption value="">—</NativeSelectOption>
                {(sites ?? []).map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>
                    {s.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Submit</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {list && list.length > 0 ? (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Recent incidents</CardTitle>
            <CardDescription>Latest 100 records.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Logged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(list ?? []).map((i) => {
                  const project = embedOne(
                    i.project as unknown as { name: string } | { name: string }[] | null,
                  );
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.title}</TableCell>
                      <TableCell>
                        <Badge variant={i.severity === "high" ? "destructive" : "secondary"}>
                          {i.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{project?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {new Date(i.created_at).toLocaleString()}
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
            <EmptyTitle>No incidents logged</EmptyTitle>
            <EmptyDescription>Reports submitted by your team will show up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
