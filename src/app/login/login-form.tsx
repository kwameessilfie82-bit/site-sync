"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PENDING_ORG_INVITE_META_KEY } from "@/lib/invite-metadata";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite")?.trim();
  const nextDefault =
    invite && invite.length >= 8
      ? `/onboarding?invite=${encodeURIComponent(invite)}`
      : "/dashboard";
  const next = searchParams.get("next") ?? nextDefault;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const raw = user?.user_metadata?.[PENDING_ORG_INVITE_META_KEY];
    const pending = typeof raw === "string" ? raw.trim() : "";
    const dest =
      pending.length >= 8 ? `/onboarding?invite=${encodeURIComponent(pending)}` : next;
    router.push(dest);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
