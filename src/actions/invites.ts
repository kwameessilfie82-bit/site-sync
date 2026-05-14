"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { PENDING_ORG_INVITE_META_KEY } from "@/lib/invite-metadata";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types/database";

const invitableRoles: UserRole[] = ["employee", "supervisor", "pm"];

export async function createOrganizationInvite(
  invitedRole: UserRole,
  options?: { multiUse?: boolean; maxUses?: number | null },
) {
  if (!invitableRoles.includes(invitedRole)) {
    return { error: "Invalid role for invite." };
  }

  const multiUse = options?.multiUse === true;
  const maxUses = multiUse ? (options?.maxUses ?? null) : null;
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    return { error: "Max uses must be a positive integer or left empty for unlimited." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return { error: "No organization." };
  if (!["owner", "pm", "supervisor"].includes(profile.role)) {
    return { error: "You do not have permission to create invites." };
  }

  const { data: token, error } = await supabase.rpc("create_organization_invite", {
    p_invited_role: invitedRole,
    p_multi_use: multiUse,
    p_max_uses: maxUses,
  });

  if (error) return { error: error.message };
  if (!token || typeof token !== "string") return { error: "Could not create invite." };

  await logAudit(supabase, profile.org_id, user.id, "create", "organization_invite", null, {
    invitedRole,
    multiUse,
    maxUses,
  });

  revalidatePath("/dashboard/invites");
  return { ok: true as const, token };
}

export async function acceptOrganizationInvite(token: string) {
  const trimmed = token.trim();
  if (trimmed.length < 8) return { error: "Invalid invite code." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: existing } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.org_id) {
    revalidatePath("/", "layout");
    revalidatePath("/dashboard/invites");
    await supabase.auth.updateUser({
      data: { [PENDING_ORG_INVITE_META_KEY]: "" },
    });
    return { ok: true as const };
  }

  const { error } = await supabase.rpc("accept_organization_invite", {
    p_token: trimmed,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already belongs")) {
      revalidatePath("/", "layout");
      revalidatePath("/dashboard/invites");
      await supabase.auth.updateUser({
        data: { [PENDING_ORG_INVITE_META_KEY]: "" },
      });
      return { ok: true as const };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard/invites");
  await supabase.auth.updateUser({
    data: { [PENDING_ORG_INVITE_META_KEY]: "" },
  });
  return { ok: true as const };
}

export async function revokeOrganizationInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return { error: "No organization." };
  if (!["owner", "pm", "supervisor"].includes(profile.role)) {
    return { error: "Not allowed." };
  }

  const { error } = await supabase.from("organization_invites").delete().eq("id", inviteId);

  if (error) return { error: error.message };

  await logAudit(supabase, profile.org_id, user.id, "revoke", "organization_invite", inviteId, {});

  revalidatePath("/dashboard/invites");
  return { ok: true as const };
}
