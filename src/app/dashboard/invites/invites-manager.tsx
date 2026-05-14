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
import { Input } from "@/ui/primitives/input";
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

function inviteLinkActive(row: InviteRow): boolean {
  if (new Date(row.expires_at) <= new Date()) return false;
  if (row.multi_use) {
    return row.max_uses == null || row.use_count < row.max_uses;
  }
  return !row.used_at;
}

function inviteStatusLabel(row: InviteRow): string {
  if (row.multi_use) {
    if (new Date(row.expires_at) <= new Date()) return "Expired";
    if (row.max_uses != null && row.use_count >= row.max_uses) return "Full";
    return "Active";
  }
  if (row.used_at) return "Used";
  if (new Date(row.expires_at) <= new Date()) return "Expired";
  return "Pending";
}

export type InviteRow = {
  id: string;
  token: string;
  invited_role: UserRole;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  /** Same signup link can onboard many users until expiry or revoke. */
  multi_use: boolean;
  max_uses: number | null;
  use_count: number;
  last_accepted_at: string | null;
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
  const [teamRole, setTeamRole] = useState<UserRole>("employee");
  const [teamMaxUses, setTeamMaxUses] = useState("");
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

  function onCreateOneTime() {
    start(async () => {
      const res = await createOrganizationInvite(role);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("One-time invite created. Copy the link and send it to one teammate.");
      router.refresh();
    });
  }

  function onCreateTeamLink() {
    start(async () => {
      const raw = teamMaxUses.trim();
      let maxUses: number | null = null;
      if (raw) {
        const n = Number.parseInt(raw, 10);
        if (!Number.isFinite(n) || n < 1) {
          toast.error("Max signups must be a whole number ≥ 1, or leave blank for unlimited.");
          return;
        }
        maxUses = n;
      }
      const res = await createOrganizationInvite(teamRole, { multiUse: true, maxUses });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Team link created. Share one URL with everyone you want in this role.");
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">One-time invite</CardTitle>
            <CardDescription>
              A single signup link or code for one person. After someone joins, this invite is marked used and cannot
              be reused.
            </CardDescription>
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
            <Button type="button" onClick={onCreateOneTime} disabled={pending}>
              {pending ? "Creating…" : "Generate one-time invite"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Team signup link</CardTitle>
            <CardDescription>
              One link for many people with the same role (for example a whole crew). Each person still creates their
              own account; the link stays valid until it expires (14 days) or you revoke it. Optional cap on how many
              people can join.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid w-full gap-2 sm:max-w-xs">
              <Label>Role for everyone who uses this link</Label>
              <Select value={teamRole} onValueChange={(v) => setTeamRole(v as UserRole)}>
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
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <div className="grid w-full gap-2">
                <Label htmlFor="team-max">Max signups (optional)</Label>
                <Input
                  id="team-max"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Unlimited"
                  value={teamMaxUses}
                  onChange={(e) => setTeamMaxUses(e.target.value)}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty so there is no limit besides the expiry date.
                </p>
              </div>
              <Button type="button" onClick={onCreateTeamLink} disabled={pending} className="sm:mb-0.5">
                {pending ? "Creating…" : "Create team link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
          <CardDescription>
            One-time links stop after the first signup. Team links can be shared with many people until they expire,
            hit an optional signup cap, or you revoke them.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invites.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No invites yet. Create a one-time invite or a team link above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signups</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((row) => {
                  const linkActive = inviteLinkActive(row);
                  const status = inviteStatusLabel(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground">
                        {row.multi_use ? "Team link" : "One-time"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatInvitedRole(row.invited_role)}</Badge>
                      </TableCell>
                      <TableCell>
                        {status === "Pending" || status === "Active" ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{status}</span>
                        ) : status === "Used" || status === "Full" || status === "Expired" ? (
                          <span className="text-muted-foreground">{status}</span>
                        ) : (
                          <span className="text-muted-foreground">{status}</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">
                        {row.multi_use
                          ? row.max_uses == null
                            ? `${row.use_count} (no cap)`
                            : `${row.use_count} / ${row.max_uses}`
                          : row.used_at
                            ? "1 / 1"
                            : "—"}
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
                            disabled={!linkActive}
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
                            disabled={!linkActive}
                            onClick={() => copyToken(row.token)}
                          >
                            <Copy className="size-3.5" />
                            Code
                          </Button>
                          {!row.used_at && (
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
