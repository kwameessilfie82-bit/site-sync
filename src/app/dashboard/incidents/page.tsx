import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { IncidentReportForm } from "@/components/incident-report-form";
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
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/onboarding");

  const orgId = profile.org_id;
  const isOwner = profile.role === "owner";

  const { data: list } = await supabase
    .from("incidents")
    .select("id, title, severity, created_at, photo_storage_path, project:projects(name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: projects } = await supabase.from("projects").select("id, name").eq("org_id", orgId);

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Incidents</CardTitle>
          <CardDescription>Theft, damage, near-miss — tied to org audit trail.</CardDescription>
        </CardHeader>
      </Card>

      {!isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report incident</CardTitle>
            <CardDescription>High severity reports must include a photo.</CardDescription>
          </CardHeader>
          <CardContent>
            <IncidentReportForm projects={projects ?? []} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your role</CardTitle>
            <CardDescription>
              Owners review every incident below. Open a row for full details. New reports are submitted by PMs,
              supervisors, and field staff.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
                  <TableHead>Photo</TableHead>
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
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/incidents/${i.id}`} className="hover:underline">
                          {i.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={i.severity === "high" ? "destructive" : "secondary"}>
                          {i.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{project?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.photo_storage_path ? "Yes" : "—"}
                      </TableCell>
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
