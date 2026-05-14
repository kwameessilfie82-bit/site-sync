"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function linkProfileToPerson(profileId: string, formData: FormData): Promise<void> {
  const raw = String(formData.get("person_id") ?? "").trim();
  const personId = raw === "" ? null : raw;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: me } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!me?.org_id) return;
  if (!["owner", "pm"].includes(me.role)) return;

  if (personId) {
    const { data: person } = await supabase
      .from("people")
      .select("id")
      .eq("id", personId)
      .eq("org_id", me.org_id)
      .single();
    if (!person) return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ person_id: personId })
    .eq("id", profileId)
    .eq("org_id", me.org_id);

  if (error) return;

  await logAudit(supabase, me.org_id, user.id, "update", "profile", profileId, {
    person_id: personId,
  });

  revalidatePath("/dashboard/invites");
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/awaiting-project");
}
