import { createClient } from "@/lib/supabase/server";
import { createPerson } from "@/actions/people";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Badge } from "@/ui/primitives/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/primitives/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/primitives/empty";
import { Users } from "lucide-react";

export default async function PeoplePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .single();

  const { data: people } = await supabase
    .from("people")
    .select("id, full_name, phone, technician_id, trade, is_active")
    .eq("org_id", profile!.org_id!)
    .order("full_name");

  const canManage = ["owner", "pm", "supervisor"].includes(profile!.role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-muted-foreground">
          Field workers and technician IDs for QC alignment. Link accounts under Team.
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add person</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createPerson} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technician_id">Technician ID</Label>
                <Input id="technician_id" name="technician_id" placeholder="QC log ID" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="trade">Trade</Label>
                <Input id="trade" name="trade" placeholder="Welder, operator, …" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {people && people.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">People directory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Technician ID</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.trade ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.technician_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "secondary" : "outline"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="size-4" />
            </EmptyMedia>
            <EmptyTitle>No people yet</EmptyTitle>
            <EmptyDescription>
              Add workers to start attendance, roster assignments, and accountability flows.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
