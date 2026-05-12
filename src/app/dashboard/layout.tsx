import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import type { UserRole } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/onboarding");

  const role = profile.role as UserRole;
  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.org_id)
    .maybeSingle();

  const displayName =
    profile.display_name?.trim() ||
    user.email?.trim() ||
    (typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "") ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "") ||
    "Member";

  return (
    <DashboardShell
      role={role}
      orgName={organization?.name ?? "Organization"}
      displayName={displayName}
    >
      {children}
    </DashboardShell>
  );
}
