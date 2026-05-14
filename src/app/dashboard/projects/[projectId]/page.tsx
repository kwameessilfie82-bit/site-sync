import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectLifecyclePanel } from "@/components/project-lifecycle-panel";
import { createProjectLogSheet, addLogSheetColumn } from "@/actions/project-log-sheets";
import { DeleteLogSheetButton } from "@/components/delete-log-sheet-button";
import { DeleteLogSheetColumnButton } from "@/components/delete-log-sheet-column-button";
import { ProjectWorkZoneCard } from "@/components/project-work-zone-card";
import { ProjectTeamCard, type RosterDbRow } from "@/components/project-team-card";
import { rosterRowIsActive, todayYmdUtc } from "@/lib/project-assignment";
import { isProjectGeofenceColumnError } from "@/lib/project-geofence-error";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/primitives/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/ui/primitives/empty";
import { Separator } from "@/ui/primitives/separator";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/primitives/table";

type Props = { params: Promise<{ projectId: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProjectRow = {
  id: string;
  name: string;
  client_name: string | null;
  is_active: boolean;
  site_latitude: number | null;
  site_longitude: number | null;
  site_radius_m: number | null;
};

type SheetRow = {
  id: string;
  name: string;
  sort_order: number;
  project_log_sheet_columns: { id: string; label: string; column_key: string; sort_order: number }[] | null;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  if (!UUID_RE.test(projectId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  if (!profile?.org_id) redirect("/onboarding");

  const orgId = profile.org_id;

  const geoSelect = "id, name, client_name, is_active, site_latitude, site_longitude, site_radius_m";
  const baseSelect = "id, name, client_name, is_active";

  let project: ProjectRow | null = null;

  const withGeo = await supabase
    .from("projects")
    .select(geoSelect)
    .eq("id", projectId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (withGeo.data) {
    project = withGeo.data as ProjectRow;
  } else if (withGeo.error && isProjectGeofenceColumnError(withGeo.error.message)) {
    const withoutGeo = await supabase
      .from("projects")
      .select(baseSelect)
      .eq("id", projectId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (withoutGeo.error) {
      console.error("project detail load failed", withoutGeo.error.message);
      throw new Error("Could not load this project.");
    }
    if (withoutGeo.data) {
      project = {
        ...(withoutGeo.data as Omit<ProjectRow, "site_latitude" | "site_longitude" | "site_radius_m">),
        site_latitude: null,
        site_longitude: null,
        site_radius_m: null,
      };
    }
  } else if (withGeo.error) {
    console.error("project detail load failed", withGeo.error.message);
    throw new Error("Could not load this project.");
  }

  if (!project) notFound();

  const canManage = ["owner", "pm", "supervisor"].includes(profile.role);

  const { data: sheets } = await supabase
    .from("project_log_sheets")
    .select(
      "id, name, sort_order, project_log_sheet_columns ( id, label, column_key, sort_order )",
    )
    .eq("project_id", projectId)
    .order("sort_order")
    .order("name");

  const typedSheets = (sheets ?? []) as SheetRow[];

  const { data: logRows } = await supabase
    .from("project_activity_logs")
    .select(
      "id, created_at, client_name, work_location, log_date, log_sheet_id, author_profile_id, custom_values",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(40);

  const authorIds = [...new Set((logRows ?? []).map((r) => r.author_profile_id))];
  const { data: authors } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", authorIds)
      : { data: [] as { id: string; display_name: string }[] };

  const authorName = new Map((authors ?? []).map((a) => [a.id, a.display_name]));

  const sheetNameById = new Map(typedSheets.map((s) => [s.id, s.name]));

  const today = todayYmdUtc();
  const { data: rosterRaw } = canManage
    ? await supabase
        .from("roster_assignments")
        .select("id, person_id, valid_from, valid_to, person:people ( full_name )")
        .eq("project_id", projectId)
    : { data: [] as RosterDbRow[] };

  const { data: peopleAll } = canManage
    ? await supabase
        .from("people")
        .select("id, full_name")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("full_name")
    : { data: [] as { id: string; full_name: string }[] };

  const activePersonIds = new Set(
    (rosterRaw ?? [])
      .filter((r) => rosterRowIsActive({ valid_from: r.valid_from, valid_to: r.valid_to }, today))
      .map((r) => r.person_id),
  );
  const candidatePeople = (peopleAll ?? []).filter((p) => !activePersonIds.has(p.id));

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {project.name}
          </h1>
          {project.client_name && (
            <p className="mt-1 text-sm text-muted-foreground">Default client: {project.client_name}</p>
          )}
          {!project.is_active && (
            <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              This project is inactive — it stays visible to managers but is hidden from employee field-log and
              check-in project lists.
            </p>
          )}
        </div>
      </div>

      {canManage && (
        <ProjectLifecyclePanel projectId={project.id} isActive={project.is_active} />
      )}

      <ProjectWorkZoneCard
        key={`wz-${project.id}-${String(project.site_latitude)}-${String(project.site_longitude)}-${String(project.site_radius_m)}`}
        projectId={project.id}
        initialLat={project.site_latitude}
        initialLng={project.site_longitude}
        initialRadiusM={project.site_radius_m}
        canManage={canManage}
      />

      {canManage ? (
        <ProjectTeamCard
          projectId={project.id}
          canManage
          rosterRows={(rosterRaw ?? []) as RosterDbRow[]}
          candidatePeople={candidatePeople}
        />
      ) : null}

      {canManage && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">New log sheet</CardTitle>
            <CardDescription>
              Log sheets are reusable templates for field activities (for example Patch repair, Spark test). Add
              columns your crew will fill in besides the standard header (client, location, date, geomembrane).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createProjectLogSheet} className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="project_id" value={projectId} />
              <div className="grid flex-1 gap-2">
                <Label htmlFor="sheet-name">Activity / log sheet name</Label>
                <Input id="sheet-name" name="name" required placeholder="Patch repair log" />
              </div>
              <Button type="submit">Add log sheet</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Log sheets & columns</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Employees submit entries from Field logs. You define which extra fields appear on each sheet.
          </p>
        </div>
        <Separator />
        {typedSheets.length === 0 ? (
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyTitle>No log sheets yet</EmptyTitle>
              <EmptyDescription>
                {canManage
                  ? "Create a log sheet above, then add columns (for example Patch number, Machine operator)."
                  : "Your manager will add log sheets here."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-6">
            {typedSheets.map((sheet) => {
              const cols = [...(sheet.project_log_sheet_columns ?? [])].sort(
                (a, b) => a.sort_order - b.sort_order,
              );
              return (
                <Card key={sheet.id} className="border-border/80 shadow-sm">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-base">{sheet.name}</CardTitle>
                      <CardDescription>
                        {cols.length} column{cols.length === 1 ? "" : "s"} ·{" "}
                        <Link
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                          href={`/dashboard/field-logs/${projectId}/${sheet.id}/submit`}
                        >
                          Submit form
                        </Link>
                        {" · "}
                        <Link
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                          href={`/dashboard/projects/${projectId}/log-sheets/${sheet.id}/submissions`}
                        >
                          All submissions
                        </Link>
                      </CardDescription>
                    </div>
                    {canManage && <DeleteLogSheetButton logSheetId={sheet.id} />}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cols.length > 0 && (
                      <ul className="space-y-2 text-sm">
                        {cols.map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2"
                          >
                            <span>
                              <span className="font-medium">{c.label}</span>
                              <span className="ml-2 font-mono text-xs text-muted-foreground">{c.column_key}</span>
                            </span>
                            {canManage && <DeleteLogSheetColumnButton columnId={c.id} />}
                          </li>
                        ))}
                      </ul>
                    )}
                    {canManage && (
                      <form action={addLogSheetColumn} className="flex max-w-lg flex-col gap-2 sm:flex-row sm:items-end">
                        <input type="hidden" name="log_sheet_id" value={sheet.id} />
                        <div className="grid flex-1 gap-2">
                          <Label htmlFor={`col-${sheet.id}`}>New column label</Label>
                          <Input
                            id={`col-${sheet.id}`}
                            name="label"
                            required
                            placeholder="Patch number"
                          />
                        </div>
                        <Button type="submit" variant="secondary">
                          Add column
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Recent field logs (all sheets)</h2>
        <p className="text-sm text-muted-foreground">
          For a full history and CSV export, open a log sheet and choose{" "}
          <span className="font-medium text-foreground">All submissions</span>.
        </p>
        <Separator />
        {!logRows?.length ? (
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyTitle>No submissions yet</EmptyTitle>
              <EmptyDescription>Entries from the crew will show up here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Sheet</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{sheetNameById.get(row.log_sheet_id) ?? "—"}</TableCell>
                      <TableCell>{authorName.get(row.author_profile_id) ?? "—"}</TableCell>
                      <TableCell>{row.client_name}</TableCell>
                      <TableCell className="max-w-[12rem] truncate">{row.work_location}</TableCell>
                      <TableCell>{row.log_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              Latest 40 entries across every log sheet on this project.
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
