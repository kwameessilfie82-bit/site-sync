"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createPerson(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return;
  if (!["owner", "pm", "supervisor"].includes(profile.role)) return;

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return;

  const phone = String(formData.get("phone") ?? "").trim() || null;
  const technicianId = String(formData.get("technician_id") ?? "").trim() || null;
  const trade = String(formData.get("trade") ?? "").trim() || null;

  const { data: person, error } = await supabase
    .from("people")
    .insert({
      org_id: profile.org_id,
      full_name: fullName,
      phone,
      technician_id: technicianId,
      trade,
    })
    .select("id")
    .single();

  if (error || !person) return;

  await logAudit(supabase, profile.org_id, profile.id, "create", "person", person.id, {
    fullName,
  });

  revalidatePath("/dashboard/people");
}

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

  revalidatePath("/dashboard/people");
  revalidatePath("/dashboard/team");
}
