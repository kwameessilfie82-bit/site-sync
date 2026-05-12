import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit(
  supabase: SupabaseClient,
  orgId: string,
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
) {
  await supabase.from("audit_events").insert({
    org_id: orgId,
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId,
    metadata: metadata ?? null,
  });
}
