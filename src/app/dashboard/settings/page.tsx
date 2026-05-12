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

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, org_id, email")
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
          <CardDescription>Display name is shown in the header, attendance, and audit where relevant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProfileSettingsForm initialDisplayName={displayName} />
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
          <p className="leading-relaxed text-muted-foreground">
            {rbac.canManageTeamAndAudit && rbac.canSuperviseFloor && (
              <>
                You have <span className="font-medium text-foreground">staff</span> access: team accounts,
                audit log, invites, and all field tools (projects, people, roster, live floor, assets).
              </>
            )}
            {rbac.canSuperviseFloor && !rbac.canManageTeamAndAudit && (
              <>
                You have <span className="font-medium text-foreground">field lead</span> access: projects,
                people, invites, roster, live on site, and assets. Team accounts and audit are owner/PM only.
              </>
            )}
            {rbac.isWorker && (
              <>
                You have <span className="font-medium text-foreground">worker</span> access: overview,
                check-in, attendance log, and incidents. Ask an owner or PM if you need a different role.
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
