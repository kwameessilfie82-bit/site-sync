"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateMyDisplayName } from "@/actions/profile";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { toast } from "sonner";

export function ProfileSettingsForm({ initialDisplayName }: { initialDisplayName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateMyDisplayName(fd);
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
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
