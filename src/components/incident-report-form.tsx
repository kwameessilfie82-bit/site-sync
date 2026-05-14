"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createIncident } from "@/actions/incidents";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Textarea } from "@/ui/primitives/textarea";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { toast } from "sonner";

type ProjectOpt = { id: string; name: string };

export function IncidentReportForm({ projects }: { projects: ProjectOpt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [severity, setSeverity] = useState("low");

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      encType="multipart/form-data"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const sev = String(fd.get("severity") ?? "low").toLowerCase();
        const file = fd.get("photo");
        if (sev === "high" && (!(file instanceof File) || file.size === 0)) {
          toast.error("High severity incidents require a photo.");
          return;
        }
        startTransition(async () => {
          const res = await createIncident(fd);
          if (res.error) {
            toast.error(res.error);
            return;
          }
          toast.success("Incident reported.");
          e.currentTarget.reset();
          setSeverity("low");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="Missing welding unit" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} placeholder="What happened, when, witnesses…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="severity">Severity</Label>
        <NativeSelect
          name="severity"
          id="severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="w-full max-w-xs"
        >
          <NativeSelectOption value="low">Low</NativeSelectOption>
          <NativeSelectOption value="medium">Medium</NativeSelectOption>
          <NativeSelectOption value="high">High</NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="project_id">Project (optional)</Label>
        <NativeSelect name="project_id" id="project_id" className="w-full max-w-md" defaultValue="">
          <NativeSelectOption value="">—</NativeSelectOption>
          {projects.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="photo">Photo {severity === "high" ? "(required for high)" : "(optional)"}</Label>
        <Input id="photo" name="photo" type="file" accept="image/*" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          Submit
        </Button>
      </div>
    </form>
  );
}
