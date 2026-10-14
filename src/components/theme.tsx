"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/format";
import { Moon, Sun } from "./icons";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/** Runs before paint so the stored theme is applied without a flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");document.documentElement.dataset.theme=(t==="light"||t==="dark")?t:"dark";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

const listeners = new Set<() => void>();
let current: Theme = "dark";

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function sync() {
  const t = (document.documentElement.dataset.theme as Theme) || "dark";
  if (t !== current) {
    current = t;
    emit();
  }
}

export function setTheme(t: Theme) {
  current = t;
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {}
  document.documentElement.dataset.theme = t;
  emit();
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => current,
    () => "dark" as Theme,
  );
  useEffect(sync, []);
  return theme;
}

/** One round button that flips the theme; it shows the theme you'd switch to. */
export function ThemeButton({ className }: { className?: string }) {
  const theme = useTheme();
  const light = theme === "light";
  return (
    <button
      type="button"
      onClick={() => setTheme(light ? "dark" : "light")}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      className={cn("grid h-10 w-10 place-items-center rounded-full text-mute transition-colors hover:text-fg", className)}
    >
      {light ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

/** Light / dark as a glass segmented control. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  return (
    <div className={cn("seg seg-icon", className)} role="group" aria-label="Theme">
      {(["light", "dark"] as const).map((t) => (
        <button key={t} type="button" onClick={() => setTheme(t)} aria-label={`${t} theme`} aria-pressed={theme === t}>
          {t === "light" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      ))}
    </div>
  );
}
