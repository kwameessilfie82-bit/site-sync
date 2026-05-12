"use server";

import { createClient } from "@/lib/supabase/server";
import { distanceMeters } from "@/lib/geo";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function clockIn(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, id, role, person_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return { error: "No organization." };
  if (!profile.person_id) {
    return {
      error:
        "Your account is not linked to a worker profile. Ask an owner or PM to link you in Team.",
    };
  }

  const siteId = String(formData.get("site_id") ?? "");
  if (!siteId) return { error: "Select a site." };

  const token = String(formData.get("token") ?? "").trim() || null;
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();
  const latitude = latRaw ? Number(latRaw) : null;
  const longitude = lngRaw ? Number(lngRaw) : null;

  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("id, latitude, longitude, geofence_radius_m, project_id")
    .eq("id", siteId)
    .single();

  if (siteErr || !site) return { error: "Site not found." };

  const { data: siteProject } = await supabase
    .from("projects")
    .select("org_id")
    .eq("id", site.project_id)
    .single();

  if (!siteProject || siteProject.org_id !== profile.org_id) {
    return { error: "Site not in your organization." };
  }

  let tokenId: string | null = null;
  if (token) {
    const { data: tok } = await supabase
      .from("site_check_in_tokens")
      .select("id, site_id, is_active")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();
    if (!tok || tok.site_id !== siteId) {
      return { error: "Invalid or inactive check-in code for this site." };
    }
    tokenId = tok.id;
  }

  const radius = site.geofence_radius_m;
  if (
    radius != null &&
    site.latitude != null &&
    site.longitude != null &&
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    const d = distanceMeters(latitude, longitude, site.latitude, site.longitude);
    if (d > radius) {
      return {
        error: `Outside site geofence (~${Math.round(d)}m from center, limit ${radius}m).`,
      };
    }
  }

  const { data: open } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("person_id", profile.person_id)
    .is("clock_out_at", null)
    .maybeSingle();

  if (open) {
    return { error: "You already have an open session. Clock out first." };
  }

  const method = tokenId ? "qr" : "self";

  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .insert({
      org_id: profile.org_id,
      person_id: profile.person_id,
      site_id: siteId,
      clock_in_lat: latitude,
      clock_in_lng: longitude,
      method,
      site_check_in_token_id: tokenId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit(supabase, profile.org_id, profile.id, "clock_in", "attendance_session", session.id, {
    siteId,
  });

  revalidatePath("/dashboard/check-in");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/attendance/live");
  return { ok: true as const, sessionId: session.id };
}

export async function clockOut(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, id, person_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id || !profile.person_id) {
    return { error: "Not linked to a worker profile." };
  }

  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();
  const latitude = latRaw ? Number(latRaw) : null;
  const longitude = lngRaw ? Number(lngRaw) : null;

  const { data: open, error: findErr } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("person_id", profile.person_id)
    .is("clock_out_at", null)
    .maybeSingle();

  if (findErr || !open) return { error: "No open session to close." };

  const { error } = await supabase
    .from("attendance_sessions")
    .update({
      clock_out_at: new Date().toISOString(),
      clock_out_lat: latitude,
      clock_out_lng: longitude,
    })
    .eq("id", open.id)
    .eq("org_id", profile.org_id);

  if (error) return { error: error.message };

  await logAudit(supabase, profile.org_id, profile.id, "clock_out", "attendance_session", open.id, {});

  revalidatePath("/dashboard/check-in");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/attendance/live");
  return { ok: true as const };
}

/** Supervisor: clock in another person (same org). */
export async function supervisorClockIn(formData: FormData): Promise<void> {
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

  const personId = String(formData.get("person_id") ?? "");
  const siteId = String(formData.get("site_id") ?? "");
  if (!personId || !siteId) return;

  const { data: person } = await supabase
    .from("people")
    .select("id")
    .eq("id", personId)
    .eq("org_id", profile.org_id)
    .single();

  if (!person) return;

  const { data: site } = await supabase
    .from("sites")
    .select("id, project_id")
    .eq("id", siteId)
    .single();

  if (!site) return;

  const { data: siteProject } = await supabase
    .from("projects")
    .select("org_id")
    .eq("id", site.project_id)
    .single();

  if (!siteProject || siteProject.org_id !== profile.org_id) return;

  const { data: open } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("person_id", personId)
    .is("clock_out_at", null)
    .maybeSingle();

  if (open) return;

  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .insert({
      org_id: profile.org_id,
      person_id: personId,
      site_id: siteId,
      method: "supervisor",
      attested_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !session) return;

  await logAudit(supabase, profile.org_id, profile.id, "clock_in_supervisor", "attendance_session", session.id, {
    personId,
    siteId,
  });

  revalidatePath("/dashboard/attendance/live");
}

export async function supervisorClockOut(formData: FormData): Promise<void> {
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

  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) return;

  const { error } = await supabase
    .from("attendance_sessions")
    .update({ clock_out_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("org_id", profile.org_id)
    .is("clock_out_at", null);

  if (error) return;

  revalidatePath("/dashboard/attendance/live");
}
