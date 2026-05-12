"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { error: "Name must be at least 2 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_my_organization", {
    org_name: name,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
