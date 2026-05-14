import Link from "next/link";
import { subDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { AttendanceDateRangeForm } from "@/app/dashboard/attendance/attendance-date-range-form";
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

const MAX_ROWS = 500;

function parseYmd(s: string | undefined, fallback: Date): string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return format(fallback, "yyyy-MM-dd");
  return s;
}

function localBounds(fromYmd: string, toYmd: string): { start: string; end: string } {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
  const end = new Date(ty, tm - 1, td, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function headingForRow(clockInAt: string): string {
  return new Date(clockInAt).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Row = {
  id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  method: string;
  person: unknown;
  project: unknown;
};

type Props = { searchParams?: Promise<{ from?: string; to?: string }> };

export default async function AttendanceLogPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const today = new Date();
  const fromYmd = parseYmd(sp.from, subDays(today, 7));
  const toYmd = parseYmd(sp.to, today);
  const { start, end } = localBounds(fromYmd, toYmd);

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
      "id, clock_in_at, clock_out_at, method, person:people(full_name), project:projects(name)",
    )
    .eq("org_id", profile!.org_id!)
    .gte("clock_in_at", start)
    .lte("clock_in_at", end)
    .order("clock_in_at", { ascending: false })
    .limit(MAX_ROWS);

  const typedRows = (rows ?? []) as Row[];

  const groups: { heading: string; rows: Row[] }[] = [];
  let currentHeading = "";
  for (const r of typedRows) {
    const h = headingForRow(r.clock_in_at);
    if (h !== currentHeading) {
      currentHeading = h;
      groups.push({ heading: h, rows: [r] });
    } else {
      groups[groups.length - 1]!.rows.push(r);
    }
  }

  const hasRows = typedRows.length > 0;

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-2xl tracking-tight">Attendance log</CardTitle>
            <CardDescription>Filter by clock-in date, grouped by calendar day.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/api/export/attendance?from=${encodeURIComponent(fromYmd)}&to=${encodeURIComponent(toYmd)}`}
            >
              Download CSV
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <AttendanceDateRangeForm from={fromYmd} to={toYmd} maxRows={MAX_ROWS} />
        </CardContent>
      </Card>

      {!hasRows ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyTitle>No sessions in this range</EmptyTitle>
            <EmptyDescription>Try widening the dates or confirm your team has clocked in recently.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <Card key={g.heading} className="overflow-hidden border-border/80 shadow-sm">
              <CardHeader className="border-b bg-muted/30 py-3">
                <CardTitle className="text-base font-medium">{g.heading}</CardTitle>
                <CardDescription>
                  {g.rows.length} session{g.rows.length === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[min(60vh,560px)] w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Person</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>In</TableHead>
                        <TableHead>Out</TableHead>
                        <TableHead>Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.rows.map((r) => {
                        const person = embedOne(
                          r.person as unknown as { full_name: string } | { full_name: string }[] | null,
                        );
                        const project = embedOne(
                          r.project as unknown as { name: string } | { name: string }[] | null,
                        );
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{person?.full_name ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{project?.name ?? "—"}</TableCell>
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
          ))}
        </div>
      )}
    </div>
  );
}
