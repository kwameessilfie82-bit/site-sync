"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateMyProfile } from "@/actions/profile";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { toast } from "sonner";

export function ProfileSettingsForm({
  initialDisplayName,
  initialPhone,
}: {
  initialDisplayName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateMyProfile(fd);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Profile updated.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          maxLength={120}
          defaultValue={initialDisplayName}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          maxLength={40}
          defaultValue={initialPhone}
          autoComplete="tel"
          placeholder="Optional"
        />
        <p className="text-xs text-muted-foreground">
          If your login is linked to a person record, this also updates the phone shown in the people directory.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
