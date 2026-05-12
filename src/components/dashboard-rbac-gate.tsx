"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { canAccessDashboardPath } from "@/lib/rbac";
import type { UserRole } from "@/types/database";
import { Spinner } from "@/ui/primitives/spinner";

export function DashboardRbacGate({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccessDashboardPath(pathname, role);

  useEffect(() => {
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, router]);

  if (!allowed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
        <Spinner className="size-6" />
        <p>You don&apos;t have access to that page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
