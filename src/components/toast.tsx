"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { Alert, Check, Info, X } from "./icons";

export type Toast = {
  tone: "success" | "error" | "info";
  title: string;
  description?: string;
  action?: { label: string; href: string };
};

const ToastContext = createContext<(t: Toast) => void>(() => {});

const ICON = {
  success: <Check size={14} />,
  error: <Alert size={14} />,
  info: <Info size={14} />,
};
const TONE = {
  success: "text-t-green bg-t-green/14",
  error: "text-t-red bg-t-red/14",
  info: "text-t-blue bg-t-blue/14",
};

/** Up to three toasts at once, each dismissing itself after six seconds. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<(Toast & { id: number })[]>([]);

  const push = useCallback((t: Toast) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 6000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 z-[100] flex flex-col gap-2 bottom-[calc(var(--mp-nav-h)+var(--mp-action-h)+16px)] lg:inset-x-auto lg:bottom-5 lg:right-5 lg:w-[380px]"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div key={t.id} className="toast scale-in pointer-events-auto flex items-start gap-3 rounded-[20px] p-3.5">
            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", TONE[t.tone])}>{ICON[t.tone]}</span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13.5px] font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 break-words text-[12.5px] leading-[17px] text-dim">{t.description}</p>}
              {t.action && (
                <a href={t.action.href} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex text-[12.5px] font-semibold text-accent hover:underline">
                  {t.action.label} →
                </a>
              )}
            </div>
            <button
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              className="-m-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute transition-colors hover:text-fg"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
