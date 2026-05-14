/**
 * PostgREST errors when `projects` geofence columns are missing (migrations not applied).
 */
export function isProjectGeofenceColumnError(message: string | undefined): boolean {
  if (!message) return false;
  return /site_latitude|site_longitude|site_radius_m/i.test(message);
}
