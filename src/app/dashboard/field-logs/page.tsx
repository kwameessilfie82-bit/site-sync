import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProjectsForFieldLogs } from "@/lib/field-log-access";
import type { UserRole } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Button } from "@/ui/primitives/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/ui/primitives/empty";
import { Badge } from "@/ui/primitives/badge";

export default async function FieldLogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role, person_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/onboarding");

  const role = profile.role as UserRole;
  const projects = await loadProjectsForFieldLogs(
    supabase,
    profile.org_id,
    role,
    profile.person_id,
  );

  const projectIds = projects.map((p) => p.id);
  const sheetsByProject = new Map<string, { id: string; name: string }[]>();

  if (projectIds.length > 0) {
    const { data: sheets } = await supabase
      .from("project_log_sheets")
      .select("id, name, project_id, sort_order")
      .in("project_id", projectIds)
      .order("sort_order")
      .order("name");

    for (const row of sheets ?? []) {
      const list = sheetsByProject.get(row.project_id) ?? [];
      list.push({ id: row.id, name: row.name });
      sheetsByProject.set(row.project_id, list);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="gap-2">
          <Badge variant="secondary" className="w-fit">
            Field reporting
          </Badge>
          <CardTitle className="font-heading text-2xl tracking-tight md:text-3xl">Field logs</CardTitle>
          <CardDescription className="text-base">
            Submit activity logs for your projects. Each project uses log sheets (for example Patch repair, Spark
            test) with columns your manager configured.
          </CardDescription>
        </CardHeader>
      </Card>

      {(role === "employee" || role === "worker") && !profile.person_id && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Account setup</CardTitle>
            <CardDescription>
              Your login is not linked to a person record yet. An owner or PM can link you under Team accounts
              so you can be added to a project and submit logs.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {projects.length === 0 ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyTitle>No projects available</EmptyTitle>
            <EmptyDescription>
              {role === "employee" || role === "worker"
                ? "When a lead adds you under People on this project, it will appear here."
                : "Create a project under Projects, then define log sheets on the project page."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-6">
          {projects.map((p) => {
            const sheets = sheetsByProject.get(p.id) ?? [];
            return (
              <Card key={p.id} className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  {p.client_name && (
                    <CardDescription>Client on file: {p.client_name}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {sheets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No log sheets yet for this project.{" "}
                      {role === "employee" || role === "worker"
                        ? "Ask your manager to add activities on the project page."
                        : "Add log sheets on the project detail page."}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {sheets.map((s) => (
                        <li
                          key={s.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2"
                        >
                          <span className="font-medium">{s.name}</span>
                          <Button size="sm" asChild>
                            <Link href={`/dashboard/field-logs/${p.id}/${s.id}/submit`}>Submit log</Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
