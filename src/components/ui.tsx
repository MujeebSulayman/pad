"use client";

import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/format";
import { ChevronDown, X } from "./icons";

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span role="status" aria-label="Loading" style={{ width: size, height: size }} className="relative inline-block shrink-0">
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="absolute left-[46.5%] top-[-3.6%] h-[24%] w-[7%] rounded-full bg-current"
          style={{
            transform: `rotate(${30 * i}deg) translate(0, 150%)`,
            animation: "spinner-fade 1.2s linear infinite",
            animationDelay: `${-1.2 + 0.1 * i}s`,
          }}
        />
      ))}
    </span>
  );
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "prefix"> & {
  variant?: "primary" | "secondary" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  full?: boolean;
};

const VARIANT = { primary: "btn-white", secondary: "btn-ghost", accent: "btn-accent", ghost: "btn-ghost !bg-transparent !shadow-none" };
const SIZE = { sm: "btn-sm", md: "", lg: "btn-lg" };

export function Button({ variant = "secondary", size = "md", loading, prefix, suffix, full, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button {...rest} disabled={disabled || loading} className={cn("btn", VARIANT[variant], SIZE[size], full && "w-full", className)}>
      {loading ? <Spinner size={size === "sm" ? 13 : 15} /> : prefix}
      {children}
      {suffix && !loading && suffix}
    </button>
  );
}

export type Tone = "gray" | "blue" | "green" | "amber" | "red" | "purple" | "teal";

const TONE: Record<Tone, string> = {
  gray: "text-dim bg-[var(--steel)] shadow-[inset_0_1px_0_var(--rim)]",
  blue: "text-t-blue bg-t-blue/12",
  green: "text-t-green bg-t-green/12",
  amber: "text-t-amber bg-t-amber/14",
  red: "text-t-red bg-t-red/12",
  purple: "text-t-purple bg-t-purple/14",
  teal: "text-t-teal bg-t-teal/12",
};

export function Badge({ tone = "gray", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold leading-none tracking-[-0.005em]", TONE[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />}
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  suffix,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  suffix?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="label !text-dim">
          {label}
          {required && <span className="ml-1 text-bad">*</span>}
        </label>
        {suffix}
      </div>
      {children}
      {error ? (
        <p className="text-[12px] leading-4 text-bad">{error}</p>
      ) : hint ? (
        <p className="text-[12px] leading-4 text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ prefixText, invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { prefixText?: string; invalid?: boolean }) {
  if (prefixText)
    return (
      <div className={cn("input-wrap", invalid && "is-invalid")}>
        <span>{prefixText}</span>
        <input {...rest} className={className} />
      </div>
    );
  return <input {...rest} className={cn("input", invalid && "is-invalid", className)} />;
}

export function TextArea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} className={cn("input min-h-[96px] resize-y leading-6", invalid && "is-invalid", className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select {...rest} className={cn("input !rounded-full !py-2 text-[13px]", className)}>
        {children}
      </select>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-mute">
        <ChevronDown size={14} />
      </span>
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className="switch disabled:opacity-50">
      <i />
    </button>
  );
}

/** A label / value row with a dotted leader between them. */
export function Row({ label, value, strong, muted }: { label: ReactNode; value: ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className="receipt-row py-[6px]">
      <span className={cn("text-[13px]", strong ? "font-semibold text-fg" : "text-dim")}>{label}</span>
      <span className="leader" />
      <span className={cn("shrink-0 font-mono text-[12.5px] tabular-nums", muted ? "text-mute" : "text-fg", strong && "text-[13.5px] font-semibold")}>{value}</span>
    </div>
  );
}

export function Notice({ tone, icon, children }: { tone: "amber" | "blue"; icon: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-[20px] p-3.5",
        tone === "amber" ? "bg-t-amber/10 text-t-amber shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-amber)_28%,transparent)]" : "bg-t-blue/10 text-t-blue shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--t-blue)_26%,transparent)]",
      )}
    >
      <span className="mt-px shrink-0">{icon}</span>
      <div className="min-w-0 text-[12.5px] leading-[18px]">{children}</div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <div className="fade-in absolute inset-0 bg-black/45 backdrop-blur-[6px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("sheet sheet-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[30px] sm:rounded-[30px]", wide ? "sm:max-w-[720px]" : "sm:max-w-[520px]")}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="text-[22px] leading-tight">{title}</h2>
            {description && <p className="mt-1.5 text-[13.5px] leading-5 text-dim">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-mute transition-colors hover:bg-[var(--steel)] hover:text-fg">
            <X size={15} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:pb-4">{footer}</div>}
      </div>
    </div>
  );
}

/** Square token avatar: the image if there is one, otherwise the first two letters of the symbol. */
export function TokenAvatar({ imageUrl, symbol, className }: { imageUrl: string; symbol: string; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden bg-[var(--field-bg)] font-mono text-mute shadow-[var(--edge-sm)]", className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        symbol.slice(0, 2) || "??"
      )}
    </span>
  );
}
