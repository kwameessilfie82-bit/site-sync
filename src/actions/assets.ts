"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createAsset(formData: FormData): Promise<void> {
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

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const tag = String(formData.get("tag") ?? "").trim() || null;

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({ org_id: profile.org_id, name, tag })
    .select("id")
    .single();

  if (error || !asset) return;

  await logAudit(supabase, profile.org_id, profile.id, "create", "asset", asset.id, { name });

  revalidatePath("/dashboard/assets");
}

export async function checkoutAsset(formData: FormData): Promise<void> {
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

  const assetId = String(formData.get("asset_id") ?? "");
  const personId = String(formData.get("person_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!assetId || !personId) return;

  const { data: open } = await supabase
    .from("asset_checkouts")
    .select("id")
    .eq("asset_id", assetId)
    .is("checked_in_at", null)
    .maybeSingle();

  if (open) return;

  const { error } = await supabase.from("asset_checkouts").insert({
    asset_id: assetId,
    person_id: personId,
    notes,
  });

  if (error) return;

  revalidatePath("/dashboard/assets");
}

export async function checkinAsset(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return;
  if (!["owner", "pm", "supervisor"].includes(profile.role)) return;

  const checkoutId = String(formData.get("checkout_id") ?? "");
  if (!checkoutId) return;

  const { error } = await supabase
    .from("asset_checkouts")
    .update({ checked_in_at: new Date().toISOString() })
    .eq("id", checkoutId)
    .is("checked_in_at", null);

  if (error) return;

  revalidatePath("/dashboard/assets");
}
