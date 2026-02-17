"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "theme_preference";

type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setPreferenceState(stored);
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystem = () => setSystemScheme(media.matches ? "dark" : "light");
    applySystem();

    if (media.addEventListener) {
      media.addEventListener("change", applySystem);
      return () => media.removeEventListener("change", applySystem);
    }

    media.addListener(applySystem);
    return () => media.removeListener(applySystem);
  }, []);

  const setPreference = (value: ThemePreference) => {
    setPreferenceState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    }
  };

  const scheme: "light" | "dark" =
    preference === "system" ? systemScheme : preference;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", scheme === "dark");
    document.documentElement.style.colorScheme = scheme;
  }, [scheme]);

  const value = useMemo(
    () => ({ scheme, preference, setPreference }),
    [scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useThemePreference = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemePreference debe usarse dentro de ThemeProvider");
  }
  return ctx;
};
