import { createClient } from "@/lib/supabase/server";
import { embedOne } from "@/lib/supabase/embed";
import { createAsset, checkoutAsset, checkinAsset } from "@/actions/assets";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/ui/primitives/empty";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/primitives/table";

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
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Assets</CardTitle>
          <CardDescription>Tool checkout for basic accountability.</CardDescription>
        </CardHeader>
      </Card>

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

      {checkouts && checkouts.length > 0 ? (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Currently checked out</CardTitle>
            <CardDescription>Active checkouts across your org.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Asset</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Since</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(checkouts ?? []).map((c) => {
                  const asset = embedOne(
                    c.asset as unknown as { name: string } | { name: string }[] | null,
                  );
                  const person = embedOne(
                    c.person as unknown as { full_name: string } | { full_name: string }[] | null,
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{asset?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{person?.full_name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {new Date(c.checked_out_at).toLocaleString()}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <form action={checkinAsset} className="inline">
                            <input type="hidden" name="checkout_id" value={c.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Check in
                            </Button>
                          </form>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyTitle>Nothing checked out</EmptyTitle>
            <EmptyDescription>Equipment checkouts will show here when crews borrow assets.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
