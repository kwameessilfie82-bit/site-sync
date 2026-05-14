import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSettingsForm } from "@/app/dashboard/settings/profile-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Separator } from "@/ui/primitives/separator";
import { getRbacSummary } from "@/lib/rbac";
import type { UserRole } from "@/types/database";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { ScrollText, UserCog } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, org_id, email, person_id, phone")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/onboarding");

  const role = profile.role as UserRole;
  const rbac = getRbacSummary(role);
  const displayName =
    profile.display_name?.trim() ||
    user.email?.trim() ||
    (typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "") ||
    "";

  const initialPhone = profile.phone?.trim() ?? "";

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Settings</CardTitle>
          <CardDescription>Your profile and how you appear in Site Sync.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Display name and phone are used in the app header and directory where relevant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProfileSettingsForm initialDisplayName={displayName} initialPhone={initialPhone} />
          <Separator />
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Sign-in email</p>
            <p className="font-mono text-xs text-foreground">{user.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              To change your email, use your account provider or Supabase Auth settings for this project.
            </p>
          </div>
        </CardContent>
      </Card>

      {(rbac.canManageTeamAndAudit || role === "owner") && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Organization tools</CardTitle>
            <CardDescription>
              Less common pages live here so the main sidebar stays focused on day-to-day operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {rbac.canManageTeamAndAudit && (
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/dashboard/audit">
                  <ScrollText className="size-4" />
                  Audit log
                </Link>
              </Button>
            )}
            {role === "owner" && (
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/dashboard/team">
                  <UserCog className="size-4" />
                  Team accounts &amp; manual linking
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Your access</CardTitle>
          <CardDescription>Role-based permissions in this organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="secondary">{role}</Badge>
          </div>
          {profile.person_id ? (
            <p className="text-xs text-muted-foreground">
              Your login is linked to a person record — once you are added under People on a project, field logs and
              check-in unlock for that project.
            </p>
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              A person record will be created automatically when you use the app. If check-in still fails, use Team
              accounts (owners) to link your login manually.
            </p>
          )}
          <p className="leading-relaxed text-muted-foreground">
            {rbac.canManageTeamAndAudit && rbac.canSuperviseFloor && (
              <>
                You have <span className="font-medium text-foreground">staff</span> access: team accounts (from
                Settings for owners), audit log, invites (including the people directory), and all field tools
                (projects, project assignments, live attendance).
              </>
            )}
            {rbac.canSuperviseFloor && !rbac.canManageTeamAndAudit && (
              <>
                You have <span className="font-medium text-foreground">field lead</span> access: projects, invites
                (with people directory), project-level assignments, and live attendance. Team accounts and audit are
                owner/PM only.
              </>
            )}
            {rbac.isEmployee && (
              <>
                You have <span className="font-medium text-foreground">employee</span> access: after a lead assigns
                you on a project, you can use field logs, check-in, attendance, and incidents for that work.
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
