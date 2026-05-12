"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/ui/primitives/sonner";
import { TooltipProvider } from "@/ui/primitives/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={0}>
        {children}
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
