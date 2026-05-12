import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  if (!["owner", "pm"].includes(profile!.role)) {
    return (
      <p className="text-sm text-muted-foreground">
        Audit log is visible to owners and PMs only.
      </p>
    );
  }

  const { data: rows } = await supabase
    .from("audit_events")
    .select("id, action, entity, entity_id, metadata, created_at, actor:profiles(display_name)")
    .eq("org_id", profile!.org_id!)
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">Append-only style events from key actions.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Entity</th>
              <th className="px-3 py-2 font-medium">Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows ?? []).map((r) => {
              const actor = embedOne(
                r.actor as unknown as { display_name: string } | { display_name: string }[] | null,
              );
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{actor?.display_name ?? "—"}</td>
                  <td className="px-3 py-2">{r.action}</td>
                  <td className="px-3 py-2">
                    {r.entity}
                    {r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ""}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate font-mono text-xs text-muted-foreground">
                    {r.metadata ? JSON.stringify(r.metadata) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows?.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">No events yet.</p>
        )}
      </div>
    </div>
  );
}
