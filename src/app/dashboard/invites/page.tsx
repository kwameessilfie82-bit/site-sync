import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  InvitesManager,
  type InviteRow,
  type PersonDirectoryRow,
} from "@/app/dashboard/invites/invites-manager";

export default async function InvitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/onboarding");
  if (!["owner", "pm", "supervisor"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: invitesData } = await supabase
    .from("organization_invites")
    .select(
      "id, token, invited_role, expires_at, used_at, created_at, multi_use, max_uses, use_count, last_accepted_at",
    )
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: peopleData } = await supabase
    .from("people")
    .select("id, full_name, phone, technician_id, trade, is_active")
    .eq("org_id", profile.org_id)
    .order("full_name");

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.org_id)
    .single();

  const invites: InviteRow[] = (invitesData ?? []).map((r) => ({
    id: r.id,
    token: r.token,
    invited_role: r.invited_role as InviteRow["invited_role"],
    expires_at: r.expires_at,
    used_at: r.used_at,
    created_at: r.created_at,
    multi_use: Boolean(r.multi_use),
    max_uses: r.max_uses ?? null,
    use_count: r.use_count ?? 0,
    last_accepted_at: r.last_accepted_at ?? null,
  }));

  const peopleDirectory: PersonDirectoryRow[] = (peopleData ?? []).map((r) => ({
    id: r.id,
    full_name: r.full_name,
    phone: r.phone,
    technician_id: r.technician_id,
    trade: r.trade,
    is_active: r.is_active,
  }));

  return (
    <InvitesManager
      organizationName={org?.name ?? "Organization"}
      invites={invites}
      peopleDirectory={peopleDirectory}
    />
  );
}
