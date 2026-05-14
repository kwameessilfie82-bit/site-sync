import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { employeeHasActiveProjectAssignment } from "@/lib/project-assignment";
import type { UserRole } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Button } from "@/ui/primitives/button";

export default async function AwaitingProjectPage() {
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
  if (role !== "employee" && role !== "worker") {
    redirect("/dashboard");
  }

  if (profile.person_id && (await employeeHasActiveProjectAssignment(supabase, profile.person_id))) {
    redirect("/dashboard/field-logs");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.org_id)
    .maybeSingle();

  const orgName = org?.name ?? "your organization";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Almost there</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            You are part of <span className="font-medium text-foreground">{orgName}</span>, but you have not been
            assigned to a project yet. An owner or project lead will add you from that project&apos;s page. After
            that, field logs, check-in, and the rest of your workspace will open up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            You can update your profile (display name and phone) under{" "}
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/dashboard/settings">Settings</Link>
            </Button>{" "}
            while you wait.
          </p>
          <p className="text-xs">
            If you think this is a mistake, contact your site administrator and ask them to add you under{" "}
            <span className="font-medium text-foreground">Projects → your project → People on this project</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
