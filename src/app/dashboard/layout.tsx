import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { employeePendingProjectGate } from "@/lib/project-assignment";
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

  const { data: profileBefore } = await supabase
    .from("profiles")
    .select("display_name, role, org_id, person_id")
    .eq("id", user.id)
    .single();

  if (!profileBefore?.org_id) redirect("/onboarding");

  await supabase.rpc("ensure_my_person_record");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, org_id, person_id")
    .eq("id", user.id)
    .single();

  const p = profile ?? profileBefore;
  const role = p.role as UserRole;

  const employeePendingAssignment = await employeePendingProjectGate(supabase, p.role, p.person_id);

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", p.org_id)
    .maybeSingle();

  const displayName =
    p.display_name?.trim() ||
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
      employeePendingAssignment={employeePendingAssignment}
    >
      {children}
    </DashboardShell>
  );
}
