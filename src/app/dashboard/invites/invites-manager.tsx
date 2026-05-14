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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/primitives/empty";
import { Copy, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

function formatInvitedRole(role: UserRole): string {
  if (role === "employee" || role === "worker") return "Employee";
  if (role === "pm") return "Project manager";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export type InviteRow = {
  id: string;
  token: string;
  invited_role: UserRole;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type PersonDirectoryRow = {
  id: string;
  full_name: string;
  phone: string | null;
  technician_id: string | null;
  trade: string | null;
  is_active: boolean;
};

const invitableRoles: { value: UserRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "supervisor", label: "Supervisor" },
  { value: "pm", label: "Project manager" },
];

export function InvitesManager({
  organizationName,
  invites,
  peopleDirectory,
}: {
  organizationName: string;
  invites: InviteRow[];
  peopleDirectory: PersonDirectoryRow[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("employee");
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
          <CardTitle className="font-heading text-2xl tracking-tight">{"Invites & people"}</CardTitle>
          <CardDescription>
            Create a link or code for <span className="font-medium text-foreground">{organizationName}</span>, and
            browse everyone in your org directory (from invites, onboarding, or Team linking). Owners, PMs, and
            supervisors can invite employees, supervisors, or PMs — not other owners.
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

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">People directory</CardTitle>
          <CardDescription>
            Read-only list of person records in your organization. New rows are created when someone accepts an invite
            or is linked under Team accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {peopleDirectory.length === 0 ? (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="size-4" />
                </EmptyMedia>
                <EmptyTitle>No people yet</EmptyTitle>
                <EmptyDescription>
                  Generate an invite above. After someone joins, they appear here. A lead must then add them under{" "}
                  <span className="font-medium text-foreground">People on this project</span> on each job they should
                  access.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Technician ID</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {peopleDirectory.map((p) => (
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
          )}
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
                        <Badge variant="secondary">{formatInvitedRole(row.invited_role)}</Badge>
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
