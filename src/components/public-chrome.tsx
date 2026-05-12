"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/ui/primitives/button";
import { Separator } from "@/ui/primitives/separator";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            SS
          </span>
          Site Sync
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function AuthTopBar() {
  return (
    <header className="border-b border-border/80 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Button variant="ghost" size="sm" className="-ml-2 gap-2 px-2 font-semibold" asChild>
          <Link href="/">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-foreground">
              SS
            </span>
            Site Sync
          </Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
