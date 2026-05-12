"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateMyDisplayName(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 1) {
    return { error: "Display name is required." };
  }
  if (displayName.length > 120) {
    return { error: "Display name is too long." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) return { error: error.message };

  const { error: authMetaError } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });
  if (authMetaError) {
    // Profile row is updated; session metadata sync is best-effort
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
