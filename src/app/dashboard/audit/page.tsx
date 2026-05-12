import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { Alert, AlertDescription, AlertTitle } from "@/ui/primitives/alert";
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
import { ShieldOff } from "lucide-react";

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  if (!["owner", "pm"].includes(profile!.role)) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <ShieldOff />
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>
          Audit log is visible to owners and PMs only.
        </AlertDescription>
      </Alert>
    );
  }

  const { data: rows } = await supabase
    .from("audit_events")
    .select("id, action, entity, entity_id, metadata, created_at, actor:profiles(display_name)")
    .eq("org_id", profile!.org_id!)
    .order("created_at", { ascending: false })
    .limit(300);

  const hasRows = rows && rows.length > 0;

  return (
    <div className="space-y-8">
      {hasRows ? (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="font-heading text-2xl tracking-tight">Audit log</CardTitle>
            <CardDescription>Append-only style events from key actions.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[min(70vh,720px)] w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="max-w-[200px]">Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows ?? []).map((r) => {
                    const actor = embedOne(
                      r.actor as unknown as { display_name: string } | { display_name: string }[] | null,
                    );
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{actor?.display_name ?? "—"}</TableCell>
                        <TableCell>{r.action}</TableCell>
                        <TableCell>
                          {r.entity}
                          {r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ""}
                        </TableCell>
                        <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">
                          {r.metadata ? JSON.stringify(r.metadata) : "—"}
                        </TableCell>
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
            <CardHeader>
              <CardTitle className="font-heading text-2xl tracking-tight">Audit log</CardTitle>
              <CardDescription>Append-only style events from key actions.</CardDescription>
            </CardHeader>
          </Card>
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyTitle>No events yet</EmptyTitle>
              <EmptyDescription>
                Administrative actions will appear here as your organization uses Site Sync.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </>
      )}
    </div>
  );
}
