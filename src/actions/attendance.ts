"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { haversineMeters } from "@/lib/geo";
import { employeeMayAccessProject } from "@/lib/field-log-access";
import { isProjectGeofenceColumnError } from "@/lib/project-geofence-error";
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
        "Your account is not linked to an employee profile. Ask an owner or PM to link you in Team.",
    };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!projectId) return { error: "Select a project." };

  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();
  const latitude = latRaw ? Number(latRaw) : null;
  const longitude = lngRaw ? Number(lngRaw) : null;

  let project = null as {
    id: string;
    org_id: string;
    site_latitude: number | null;
    site_longitude: number | null;
    site_radius_m: number | null;
  } | null;

  const geoRes = await supabase
    .from("projects")
    .select("id, org_id, site_latitude, site_longitude, site_radius_m")
    .eq("id", projectId)
    .single();

  if (geoRes.error && isProjectGeofenceColumnError(geoRes.error.message)) {
    const base = await supabase.from("projects").select("id, org_id").eq("id", projectId).single();
    if (base.error || !base.data) return { error: "Project not found." };
    project = {
      ...base.data,
      site_latitude: null,
      site_longitude: null,
      site_radius_m: null,
    };
  } else if (geoRes.error || !geoRes.data) {
    return { error: "Project not found." };
  } else {
    project = geoRes.data;
  }

  if (!project) return { error: "Project not found." };
  if (project.org_id !== profile.org_id) {
    return { error: "Project not in your organization." };
  }

  if (profile.role === "employee" || profile.role === "worker") {
    const onProject = await employeeMayAccessProject(supabase, profile.person_id, projectId);
    if (!onProject) {
      return {
        error:
          "You are not assigned to this project. Your manager adds people on the project page when you should be on site.",
      };
    }
  }

  const siteLat = project.site_latitude;
  const siteLng = project.site_longitude;
  const radiusM = project.site_radius_m;
  const geofenceConfigured =
    siteLat != null && siteLng != null && radiusM != null && Number.isFinite(radiusM) && radiusM > 0;

  if (!geofenceConfigured) {
    return {
      error:
        "This project does not have a work zone on the map yet. Ask a supervisor to open the project and set the site location and radius before you can clock in.",
    };
  }

  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      error:
        "This job site requires GPS at clock-in. Allow location access, tap \"Capture GPS\", then try again.",
    };
  }

  const distanceM = haversineMeters(latitude, longitude, siteLat, siteLng);
  if (distanceM > radiusM) {
    return {
      error: `You are not within the job site (about ${Math.round(distanceM)} m from the site center; allowed radius is ${Math.round(radiusM)} m).`,
    };
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

  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .insert({
      org_id: profile.org_id,
      person_id: profile.person_id,
      project_id: projectId,
      clock_in_lat: latitude,
      clock_in_lng: longitude,
      method: "self",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit(supabase, profile.org_id, profile.id, "clock_in", "attendance_session", session.id, {
    projectId,
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
    return { error: "Not linked to an employee profile." };
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
  const projectId = String(formData.get("project_id") ?? "");
  if (!personId || !projectId) return;

  const { data: person } = await supabase
    .from("people")
    .select("id")
    .eq("id", personId)
    .eq("org_id", profile.org_id)
    .single();

  if (!person) return;

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", projectId)
    .single();

  if (!project || project.org_id !== profile.org_id) return;

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
      project_id: projectId,
      method: "supervisor",
      attested_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !session) return;

  await logAudit(supabase, profile.org_id, profile.id, "clock_in_supervisor", "attendance_session", session.id, {
    personId,
    projectId,
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
