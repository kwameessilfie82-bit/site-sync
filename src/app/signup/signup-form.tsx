"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PENDING_ORG_INVITE_META_KEY } from "@/lib/invite-metadata";
import { getPublicSiteUrlFromClient } from "@/lib/site-url";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/ui/primitives/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/primitives/tabs";
import { toast } from "sonner";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get("invite")?.trim() ?? "";

  const [tab, setTab] = useState<"new" | "join">(() => (inviteFromUrl ? "join" : "new"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "join" && !inviteCode.trim()) {
      toast.error("Enter the invite code from your team.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const siteUrl = getPublicSiteUrlFromClient();
    const trimmedInvite = inviteCode.trim();
    const nextPath =
      tab === "join" && trimmedInvite
        ? `/onboarding?invite=${encodeURIComponent(trimmedInvite)}`
        : "/onboarding";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        data: {
          display_name: displayName,
          ...(tab === "join" && trimmedInvite
            ? { [PENDING_ORG_INVITE_META_KEY]: trimmedInvite }
            : {}),
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email to confirm, or continue if confirmations are disabled.");
    router.push(nextPath);
    router.refresh();
  }

  return (
    <>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-2xl tracking-tight">Create account</CardTitle>
        <CardDescription>
          Start a new organization as owner, or join your team with an invite code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "join")} className="gap-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">New company</TabsTrigger>
            <TabsTrigger value="join">Join with invite</TabsTrigger>
          </TabsList>
          <TabsContent value="new" className="mt-0 space-y-3 text-left">
            <p className="text-sm text-muted-foreground">
              You&apos;ll name your organization next and become its <strong>owner</strong>.
            </p>
          </TabsContent>
          <TabsContent value="join" className="mt-0 space-y-3 text-left">
            <p className="text-sm text-muted-foreground">
              Paste the code once here (or open your invite link — it fills this for you). After you sign up,
              you&apos;ll be added to the team automatically; you won&apos;t enter the code again.
            </p>
            <div className="space-y-2">
              <Label htmlFor="invite">Invite code</Label>
              <Input
                id="invite"
                autoComplete="off"
                placeholder="Paste invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <PasswordField
            id="password"
            label="Password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={setPassword}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Sign up"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t">
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={inviteCode.trim() ? `/login?invite=${encodeURIComponent(inviteCode.trim())}` : "/login"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </>
  );
}
