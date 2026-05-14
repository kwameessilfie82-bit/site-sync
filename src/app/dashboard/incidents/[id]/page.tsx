import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/primitives/breadcrumb";
import { Badge } from "@/ui/primitives/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }> };

export default async function IncidentDetailPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/onboarding");

  const { data: incident, error } = await supabase
    .from("incidents")
    .select("id, title, description, severity, created_at, project_id, reported_by, photo_storage_path")
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .maybeSingle();

  if (error) {
    console.error("incident detail", error.message);
    throw new Error(
      "Could not load this incident. If the database is not migrated yet, apply migrations for incident photos.",
    );
  }
  if (!incident) notFound();

  let projectName: string | null = null;
  if (incident.project_id) {
    const { data: proj } = await supabase
      .from("projects")
      .select("name")
      .eq("id", incident.project_id)
      .eq("org_id", profile.org_id)
      .maybeSingle();
    projectName = proj?.name ?? null;
  }

  let reporterLabel: string | null = null;
  if (incident.reported_by) {
    const { data: rep } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", incident.reported_by)
      .maybeSingle();
    reporterLabel = rep?.display_name?.trim() || rep?.email || "Team member";
  }

  let signedImageUrl: string | null = null;
  if (incident.photo_storage_path) {
    const { data: signed } = await supabase.storage
      .from("incident-photos")
      .createSignedUrl(incident.photo_storage_path, 3600);
    signedImageUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/incidents">Incidents</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[min(100%,28rem)] truncate">{incident.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-2xl tracking-tight">{incident.title}</CardTitle>
              <CardDescription className="mt-2 tabular-nums">
                Logged {new Date(incident.created_at).toLocaleString()}
              </CardDescription>
            </div>
            <Badge variant={incident.severity === "high" ? "destructive" : "secondary"}>
              {incident.severity}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Project</dt>
              <dd className="font-medium">{projectName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reported by</dt>
              <dd className="font-medium">{reporterLabel ?? "—"}</dd>
            </div>
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Description</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {incident.description?.trim() ? incident.description : "—"}
            </p>
          </div>
          {signedImageUrl ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Photo</h3>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase Storage */}
              <img
                src={signedImageUrl}
                alt=""
                className="max-h-[28rem] w-auto max-w-full rounded-md border object-contain"
              />
            </div>
          ) : incident.photo_storage_path ? (
            <p className="text-sm text-muted-foreground">Photo is stored but could not be loaded. Try again shortly.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
