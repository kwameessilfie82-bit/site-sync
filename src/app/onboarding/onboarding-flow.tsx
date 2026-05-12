"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { acceptOrganizationInvite } from "@/actions/invites";
import { Button } from "@/ui/primitives/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Separator } from "@/ui/primitives/separator";
import { toast } from "sonner";

function OnboardingFlowInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get("invite")?.trim() ?? "";

  const [mode, setMode] = useState<"join" | "create">(inviteFromUrl ? "join" : "create");
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [pending, start] = useTransition();

  function onAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    const code = inviteCode.trim();
    if (!code) {
      toast.error("Enter your invite code.");
      return;
    }
    start(async () => {
      const res = await acceptOrganizationInvite(code);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("You have joined the organization.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-2xl tracking-tight">
          {mode === "join" ? "Join your organization" : "Create your organization"}
        </CardTitle>
        <CardDescription>
          {mode === "join"
            ? "Paste the invite code from your team lead, then accept to enter the workspace."
            : "This becomes the tenant for all projects, people, and attendance. You will be the owner."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mode === "join" ? (
          <form onSubmit={onAcceptInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite code</Label>
              <Input
                id="invite-code"
                autoComplete="off"
                placeholder="Paste invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Joining…" : "Join organization"}
            </Button>
            <Separator />
            <p className="text-center text-sm text-muted-foreground">
              Starting your own company instead?{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => setMode("create")}
              >
                Create a new organization
              </button>
            </p>
          </form>
        ) : (
          <div className="space-y-6">
            <OnboardingForm />
            <Separator />
            <p className="text-center text-sm text-muted-foreground">
              Were you invited to an existing team?{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => setMode("join")}
              >
                Join with an invite code
              </button>
            </p>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </>
  );
}

export function OnboardingFlow() {
  return (
    <Suspense
      fallback={
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading…</CardContent>
      }
    >
      <OnboardingFlowInner />
    </Suspense>
  );
}
