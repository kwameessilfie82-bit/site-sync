"use client";

import * as React from "react";

const STORAGE_KEY = "theme";

export type ThemeSetting = "light" | "dark" | "system";

type Ctx = {
  theme: ThemeSetting;
  setTheme: (t: ThemeSetting) => void;
  resolvedTheme: "light" | "dark";
  themes: readonly string[];
};

const ThemeContext = React.createContext<Ctx | null>(null);

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(theme: ThemeSetting): "light" | "dark" {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

function applyToDocument(theme: ThemeSetting): "light" | "dark" {
  const r = resolve(theme);
  document.documentElement.classList.toggle("dark", r === "dark");
  document.documentElement.style.colorScheme = r;
  return r;
}

export function AppThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: ThemeSetting;
}) {
  const [theme, setThemeState] = React.useState<ThemeSetting>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light");
  const themeRef = React.useRef(theme);

  React.useLayoutEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  React.useEffect(() => {
    let initial: ThemeSetting = defaultTheme;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") initial = raw;
    } catch {
      /* ignore */
    }
    const raf = requestAnimationFrame(() => {
      setThemeState(initial);
      setResolvedTheme(applyToDocument(initial));
    });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onOs = () => {
      if (themeRef.current === "system") {
        setResolvedTheme(applyToDocument("system"));
      }
    };
    mq.addEventListener("change", onOs);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", onOs);
    };
  }, [defaultTheme]);

  const setTheme = React.useCallback((t: ThemeSetting) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    setResolvedTheme(applyToDocument(t));
  }, []);

  const value = React.useMemo<Ctx>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      themes: ["light", "dark", "system"],
    }),
    [theme, setTheme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Same shape as `next-themes` `useTheme` for existing components. */
export function useTheme(): {
  theme?: ThemeSetting;
  setTheme: (t: string) => void;
  resolvedTheme?: "light" | "dark";
  themes: readonly string[];
} {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "system",
      setTheme: () => {},
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
    };
  }
  return {
    theme: ctx.theme,
    setTheme: (t: string) => {
      if (t === "light" || t === "dark" || t === "system") ctx.setTheme(t);
    },
    resolvedTheme: ctx.resolvedTheme,
    themes: ctx.themes,
  };
}
