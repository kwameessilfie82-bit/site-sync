"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createOrganization } from "@/actions/organization";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { toast } from "sonner";

export function OnboardingForm() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await createOrganization(fd);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      if (result && "ok" in result && result.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Company / organization name</Label>
        <Input id="name" name="name" required placeholder="e.g. DE-NAMUD Company Limited" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
