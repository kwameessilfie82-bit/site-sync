"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Building2, LogIn, LogOut } from "lucide-react";
import { getDashboardNavItems } from "@/components/dashboard-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import type { UserRole } from "@/types/database";
import { Button } from "@/ui/primitives/button";
import { Badge } from "@/ui/primitives/badge";
import { Separator } from "@/ui/primitives/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/ui/primitives/sidebar";

function resolveActiveHref(pathname: string, navItems: { href: string }[]) {
  const matches = navItems.filter((item) => {
    if (pathname === item.href) return true;
    if (item.href === "/dashboard") return false;
    return pathname.startsWith(`${item.href}/`);
  });
  if (matches.length === 0) return null;
  return matches.reduce((best, item) => (item.href.length > best.href.length ? item : best)).href;
}

export function DashboardShell({
  role,
  orgName,
  displayName,
  children,
}: {
  role: UserRole;
  orgName: string;
  displayName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = getDashboardNavItems(role);
  const activeHref = useMemo(
    () => resolveActiveHref(pathname, getDashboardNavItems(role)),
    [pathname, role],
  );

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="gap-3 border-b border-sidebar-border px-2 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="data-active:bg-sidebar-accent">
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <span className="text-xs font-bold">SS</span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Site Sync</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">{orgName}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="flex flex-wrap items-center gap-2 px-2 pb-1 group-data-[collapsible=icon]:hidden">
            <Badge variant="secondary" className="font-normal">
              {role}
            </Badge>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = href === activeHref;
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <Link href={href}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-2 border-t border-sidebar-border p-2">
          <form action="/auth/signout" method="post">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-muted/30">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <SidebarTrigger />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">Site Sync</span>
            <span className="truncate text-xs text-muted-foreground">{orgName}</span>
          </div>
          <Button size="sm" className="shrink-0 gap-1.5" asChild>
            <Link href="/dashboard/check-in">
              <LogIn className="size-3.5" />
              Check in
            </Link>
          </Button>
          <ThemeToggle />
        </header>
        <header className="sticky top-0 z-10 hidden min-h-12 shrink-0 flex-wrap items-center justify-end gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:flex lg:px-6">
          <div className="mr-auto flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex min-w-0 max-w-full items-center gap-2 sm:max-w-[min(100%,18rem)]">
              <Building2 className="size-4 shrink-0" aria-hidden />
              <span className="truncate font-medium text-foreground">{orgName}</span>
            </span>
            <Separator orientation="vertical" className="hidden h-4 sm:block" />
            <span className="min-w-0 shrink text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{displayName}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
