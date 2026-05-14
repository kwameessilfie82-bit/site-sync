"use client";

import { AppThemeProvider } from "@/components/app-theme-provider";
import { Toaster } from "@/ui/primitives/sonner";
import { TooltipProvider } from "@/ui/primitives/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppThemeProvider defaultTheme="system">
      <TooltipProvider delayDuration={0}>
        {children}
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </AppThemeProvider>
  );
}
