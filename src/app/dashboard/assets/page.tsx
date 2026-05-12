import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { createAsset, checkoutAsset, checkinAsset } from "@/actions/assets";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";

export default async function AssetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  const orgId = profile!.org_id!;
  const canManage = ["owner", "pm", "supervisor"].includes(profile!.role);

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, tag")
    .eq("org_id", orgId)
    .order("name");

  const { data: checkouts } = await supabase
    .from("asset_checkouts")
    .select(
      "id, asset_id, checked_out_at, asset:assets(name), person:people(full_name)",
    )
    .is("checked_in_at", null);

  const { data: people } = await supabase
    .from("people")
    .select("id, full_name")
    .eq("org_id", orgId)
    .order("full_name");

  const checkoutAssetIds = new Set((checkouts ?? []).map((c) => c.asset_id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="text-sm text-muted-foreground">Tool checkout for basic accountability.</p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Register asset</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAsset} className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required className="w-56" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag">Tag / ID</Label>
                <Input id="tag" name="tag" className="w-40" />
              </div>
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Check out</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={checkoutAsset} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Asset</Label>
                <NativeSelect name="asset_id" required className="w-full max-w-md">
                  {(assets ?? []).map((a) => (
                    <NativeSelectOption key={a.id} value={a.id} disabled={checkoutAssetIds.has(a.id)}>
                      {a.name}
                      {a.tag ? ` (${a.tag})` : ""}
                      {checkoutAssetIds.has(a.id) ? " — out" : ""}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label>Person</Label>
                <NativeSelect name="person_id" required className="w-full max-w-md">
                  {(people ?? []).map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.full_name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Check out</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 text-lg font-medium">Currently checked out</h2>
        <ul className="divide-y rounded-xl border">
          {(checkouts ?? []).map((c) => {
            const asset = embedOne(c.asset as unknown as { name: string } | { name: string }[] | null);
            const person = embedOne(
              c.person as unknown as { full_name: string } | { full_name: string }[] | null,
            );
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <span className="font-medium">{asset?.name ?? "—"}</span>
                  <span className="text-muted-foreground"> → {person?.full_name ?? "—"}</span>
                  <p className="text-xs text-muted-foreground">
                    since {new Date(c.checked_out_at).toLocaleString()}
                  </p>
                </div>
                {canManage && (
                  <form action={checkinAsset}>
                    <input type="hidden" name="checkout_id" value={c.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Check in
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
          {checkouts?.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing checked out.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
