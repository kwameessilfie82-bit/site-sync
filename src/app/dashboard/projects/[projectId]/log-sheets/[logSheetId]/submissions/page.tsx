import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/primitives/breadcrumb";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/primitives/table";
import { Download } from "lucide-react";

type Props = { params: Promise<{ projectId: string; logSheetId: string }> };

type Col = { column_key: string; label: string; sort_order: number };

export default async function LogSheetSubmissionsPage({ params }: Props) {
  const { projectId, logSheetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  if (!["owner", "pm", "supervisor"].includes(profile!.role)) {
    notFound();
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_name")
    .eq("id", projectId)
    .eq("org_id", profile!.org_id!)
    .single();

  if (!project) notFound();

  const { data: sheet } = await supabase
    .from("project_log_sheets")
    .select("id, name, project_id")
    .eq("id", logSheetId)
    .eq("project_id", projectId)
    .single();

  if (!sheet) notFound();

  const { data: columnRows } = await supabase
    .from("project_log_sheet_columns")
    .select("column_key, label, sort_order")
    .eq("log_sheet_id", logSheetId)
    .order("sort_order");

  const columns: Col[] = [...(columnRows ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  const { data: logs } = await supabase
    .from("project_activity_logs")
    .select(
      "id, created_at, client_name, work_location, log_date, geomembrane_material, geomembrane_thickness, geomembrane_texture, custom_values, author_profile_id",
    )
    .eq("log_sheet_id", logSheetId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20_000);

  const authorIds = [...new Set((logs ?? []).map((r) => r.author_profile_id))];
  const { data: authors } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", authorIds)
      : { data: [] as { id: string; display_name: string }[] };

  const authorName = new Map((authors ?? []).map((a) => [a.id, a.display_name]));

  const exportHref = `/api/export/project-activity-logs?projectId=${encodeURIComponent(projectId)}&logSheetId=${encodeURIComponent(logSheetId)}`;

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/dashboard/projects/${projectId}`}>{project.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{sheet.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">{sheet.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All submissions for this log sheet on {project.name}
            {project.client_name ? ` · Default client: ${project.client_name}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {(logs ?? []).length} entr{(logs ?? []).length === 1 ? "y" : "ies"}
            {(logs ?? []).length >= 20_000 ? " (showing newest 20,000 — export uses the same cap)" : ""}
          </p>
        </div>
        <Button asChild className="shrink-0 gap-2">
          <a href={exportHref}>
            <Download className="size-4" />
            Download CSV
          </a>
        </Button>
      </div>

      {!logs?.length ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyTitle>No submissions yet</EmptyTitle>
            <EmptyDescription>When employees submit this log sheet, rows will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Submission history</CardTitle>
            <CardDescription>
              Scroll horizontally to see custom columns. Use Download CSV to open in Excel or Google Sheets.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 min-w-[9rem] bg-muted/95 backdrop-blur">
                      Submitted
                    </TableHead>
                    <TableHead className="min-w-[8rem]">By</TableHead>
                    <TableHead className="min-w-[7rem]">Client</TableHead>
                    <TableHead className="min-w-[10rem]">Location</TableHead>
                    <TableHead className="min-w-[6rem]">Log date</TableHead>
                    <TableHead className="min-w-[7rem]">GM material</TableHead>
                    <TableHead className="min-w-[6rem]">GM thickness</TableHead>
                    <TableHead className="min-w-[6rem]">GM texture</TableHead>
                    {columns.map((c) => (
                      <TableHead key={c.column_key} className="min-w-[8rem]">
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((row) => {
                    const cv = (row.custom_values ?? {}) as Record<string, unknown>;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="sticky left-0 z-10 bg-background/95 text-xs text-muted-foreground backdrop-blur">
                          {new Date(row.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {authorName.get(row.author_profile_id) ?? "—"}
                        </TableCell>
                        <TableCell>{row.client_name}</TableCell>
                        <TableCell className="max-w-[14rem] whitespace-normal break-words">
                          {row.work_location}
                        </TableCell>
                        <TableCell>{row.log_date}</TableCell>
                        <TableCell>{row.geomembrane_material}</TableCell>
                        <TableCell>{row.geomembrane_thickness}</TableCell>
                        <TableCell>{row.geomembrane_texture}</TableCell>
                        {columns.map((c) => (
                          <TableCell key={c.column_key} className="max-w-[14rem] whitespace-normal break-words">
                            {cv[c.column_key] != null ? String(cv[c.column_key]) : "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
