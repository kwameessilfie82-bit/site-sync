"use client";

import { deleteProject, setProjectActive } from "@/actions/projects";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";

export function ProjectLifecyclePanel({
  projectId,
  isActive,
}: {
  projectId: string;
  isActive: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status</span>
        <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <form action={setProjectActive}>
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="is_active" value={isActive ? "false" : "true"} />
          <Button type="submit" variant="outline" size="sm">
            {isActive ? "Mark inactive" : "Mark active"}
          </Button>
        </form>
        <form
          action={deleteProject}
          onSubmit={(e) => {
            if (
              !confirm(
                "Delete this project and all of its log sheets, field logs, project people assignments, and attendance tied to it? This cannot be undone.",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="project_id" value={projectId} />
          <Button type="submit" variant="destructive" size="sm">
            Delete project
          </Button>
        </form>
      </div>
    </div>
  );
}
