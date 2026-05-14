import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { employeeMayAccessProject } from "@/lib/field-log-access";
import type { UserRole } from "@/types/database";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/primitives/breadcrumb";
import { ActivityLogSubmitForm } from "./activity-log-submit-form";

type Props = { params: Promise<{ projectId: string; logSheetId: string }> };

export default async function SubmitActivityLogPage({ params }: Props) {
  const { projectId, logSheetId } = await params;
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

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, client_name")
    .eq("id", projectId)
    .eq("org_id", profile.org_id)
    .single();

  if (!project) notFound();

  if (role === "employee" || role === "worker") {
    if (!profile.person_id) notFound();
    const ok = await employeeMayAccessProject(supabase, profile.person_id, projectId);
    if (!ok) notFound();
  }

  const { data: sheet } = await supabase
    .from("project_log_sheets")
    .select("id, name, project_id")
    .eq("id", logSheetId)
    .eq("project_id", projectId)
    .single();

  if (!sheet) notFound();

  const { data: columns } = await supabase
    .from("project_log_sheet_columns")
    .select("column_key, label, sort_order")
    .eq("log_sheet_id", logSheetId)
    .order("sort_order");

  const today = new Date().toISOString().slice(0, 10);
  const defaultClient = (project.client_name ?? "").trim();
  const defaultLocation = (project.name ?? "").trim();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/field-logs">Field logs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{sheet.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">{sheet.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
      </div>

      <ActivityLogSubmitForm
        projectId={project.id}
        logSheetId={sheet.id}
        sheetName={sheet.name}
        columns={(columns ?? []).map((c) => ({ column_key: c.column_key, label: c.label }))}
        defaultClient={defaultClient}
        defaultLocation={defaultLocation}
        defaultDate={today}
      />
    </div>
  );
}
