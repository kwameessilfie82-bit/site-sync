import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/ui/primitives/button";
import { Badge } from "@/ui/primitives/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Separator } from "@/ui/primitives/separator";
import type { UserRole } from "@/types/database";
import { Building2 } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/onboarding");

  const role = profile.role as UserRole;
  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.org_id)
    .maybeSingle();

  return (
    <div className="flex min-h-full bg-muted/30">
      <aside className="hidden w-72 shrink-0 border-r bg-background p-4 md:flex md:flex-col">
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <Link href="/dashboard" className="text-base font-semibold tracking-tight">
              Site Sync
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="size-4" />
              <span className="truncate">{organization?.name ?? "Organization"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{role}</Badge>
            </div>
          </CardContent>
        </Card>
        <DashboardNav role={role} className="flex-1" />
        <Separator className="my-4" />
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3 md:hidden">
          <Link href="/dashboard" className="text-sm font-semibold">
            Site Sync
          </Link>
          <Badge variant="secondary">{role}</Badge>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="xs">
              Out
            </Button>
          </form>
        </header>
        <div className="border-b bg-background px-4 py-2 md:px-6">
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{profile.display_name}</span>{" "}
            · {role}
          </p>
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
