import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { Button } from "@/ui/primitives/button";
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
import { ScrollArea } from "@/ui/primitives/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/primitives/table";

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

  const hasRows = rows && rows.length > 0;

  return (
    <div className="space-y-8">
      {hasRows ? (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="font-heading text-2xl tracking-tight">Attendance log</CardTitle>
              <CardDescription>Recent sessions across all sites.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/api/export/attendance">Download CSV</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[min(70vh,720px)] w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Person</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{person?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {proj ? `${proj} — ${site?.name}` : site?.name ?? "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {new Date(r.clock_in_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {r.clock_out_at ? new Date(r.clock_out_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>{r.method}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="font-heading text-2xl tracking-tight">Attendance log</CardTitle>
                <CardDescription>Recent sessions across all sites.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/api/export/attendance">Download CSV</Link>
              </Button>
            </CardHeader>
          </Card>
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyTitle>No sessions yet</EmptyTitle>
              <EmptyDescription>
                Clock-ins will appear here as your team uses check-in or supervisor tools.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </>
      )}
    </div>
  );
}
