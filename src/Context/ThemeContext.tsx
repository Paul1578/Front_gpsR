"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

const THEME_STORAGE_KEY = "theme_preference";

type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_CHANGE_EVENT = "fletflow:theme-preference-change";

function subscribeToPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function getPreferenceSnapshot(): ThemePreference {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function subscribeToSystemScheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSystemSchemeSnapshot(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribeToPreference,
    getPreferenceSnapshot,
    () => "system",
  );
  const systemScheme = useSyncExternalStore<"light" | "dark">(
    subscribeToSystemScheme,
    getSystemSchemeSnapshot,
    () => "light",
  );

  const setPreference = useCallback((value: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const scheme: "light" | "dark" =
    preference === "system" ? systemScheme : preference;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", scheme === "dark");
    document.documentElement.style.colorScheme = scheme;
  }, [scheme]);

  const value = useMemo(
    () => ({ scheme, preference, setPreference }),
    [scheme, preference, setPreference]
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
