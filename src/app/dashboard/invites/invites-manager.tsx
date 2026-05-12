"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createOrganizationInvite, revokeOrganizationInvite } from "@/actions/invites";
import type { UserRole } from "@/types/database";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Label } from "@/ui/primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/primitives/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/primitives/table";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type InviteRow = {
  id: string;
  token: string;
  invited_role: UserRole;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

const invitableRoles: { value: UserRole; label: string }[] = [
  { value: "worker", label: "Worker" },
  { value: "supervisor", label: "Supervisor" },
  { value: "pm", label: "Project manager" },
];

export function InvitesManager({
  organizationName,
  invites,
}: {
  organizationName: string;
  invites: InviteRow[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("worker");
  const [pending, start] = useTransition();

  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    [],
  );

  function copyInviteLink(token: string) {
    const url = `${origin}/signup?invite=${encodeURIComponent(token)}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Invite link copied"),
      () => toast.error("Could not copy"),
    );
  }

  function copyToken(token: string) {
    void navigator.clipboard.writeText(token).then(
      () => toast.success("Invite code copied"),
      () => toast.error("Could not copy"),
    );
  }

  function onCreate() {
    start(async () => {
      const res = await createOrganizationInvite(role);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Invite created. Copy the link and send it to your teammate.");
      router.refresh();
    });
  }

  function onRevoke(id: string) {
    start(async () => {
      const res = await revokeOrganizationInvite(id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Invite revoked");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-tight">Invites</CardTitle>
          <CardDescription>
            Create a link or code for <span className="font-medium text-foreground">{organizationName}</span>.
            Owners, PMs, and supervisors can invite workers, supervisors, or PMs — not other owners.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">New invite</CardTitle>
          <CardDescription>Invites expire after 14 days and can only be used once.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="grid w-full gap-2 sm:max-w-xs">
            <Label>Role for new member</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {invitableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={onCreate} disabled={pending}>
            {pending ? "Creating…" : "Generate invite"}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Recent invites</CardTitle>
          <CardDescription>Share the signup link or the raw code.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invites.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No invites yet. Generate one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((row) => {
                  const active = !row.used_at && new Date(row.expires_at) > new Date();
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant="secondary">{row.invited_role}</Badge>
                      </TableCell>
                      <TableCell>
                        {row.used_at ? (
                          <span className="text-muted-foreground">Used</span>
                        ) : active ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Pending</span>
                        ) : (
                          <span className="text-muted-foreground">Expired</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">
                        {new Date(row.expires_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => copyInviteLink(row.token)}
                          >
                            <Copy className="size-3.5" />
                            Link
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => copyToken(row.token)}
                          >
                            <Copy className="size-3.5" />
                            Code
                          </Button>
                          {active && (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => onRevoke(row.id)}
                              disabled={pending}
                            >
                              <Trash2 className="size-3.5" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
