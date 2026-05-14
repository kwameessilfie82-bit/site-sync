"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateMyProfile(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 1) {
    return { error: "Display name is required." };
  }
  if (displayName.length > 120) {
    return { error: "Display name is too long." };
  }

  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw === "" ? null : phoneRaw;
  if (phone && phone.length > 40) {
    return { error: "Phone number is too long." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: before } = await supabase
    .from("profiles")
    .select("person_id")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, phone })
    .eq("id", user.id);

  if (error) return { error: error.message };

  if (before?.person_id) {
    await supabase.from("people").update({ phone }).eq("id", before.person_id);
  }

  const { error: authMetaError } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });
  if (authMetaError) {
    // Profile row is updated; session metadata sync is best-effort
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/invites");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
