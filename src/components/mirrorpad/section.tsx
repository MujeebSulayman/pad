import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { ArrowRight, Check } from "../icons";
import { Reveal } from "../reveal";

export function Section({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("page-shell scroll-mt-24 pt-28 lg:pt-36", className)}>
      {children}
    </section>
  );
}

/** A section heading: big index number, kicker, statement, optional link on the right. */
export function SectionHead({
  index,
  eyebrow,
  title,
  link,
  className,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  link?: { href: string; label: string };
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-10 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex items-end gap-5">
        <span className="hidden font-mono text-[64px] font-medium leading-[0.8] tracking-[-0.08em] text-fg/10 sm:block">{index}</span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="h2 mt-3 max-w-[760px]">{title}</h2>
        </div>
      </div>
      {link && (
        <a href={link.href} className="btn btn-sm btn-ghost shrink-0">
          {link.label} <ArrowRight size={15} />
        </a>
      )}
    </Reveal>
  );
}

/** The header of one builder step: "01 / Chain" in accent mono, a title, a line of context, and a done mark. */
export function StepHead({ n, tag, title, done, children }: { n: number; tag: string; title: string; done?: boolean; children: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-mono text-[12px] text-accent">
          {String(n).padStart(2, "0")} / {tag}
        </p>
        <h3 className="mt-2.5 text-[26px] font-semibold leading-tight tracking-[-0.04em]">{title}</h3>
        <p className="mt-1.5 max-w-[60ch] text-[14.5px] leading-[21px] text-dim">{children}</p>
      </div>
      <span
        className={cn(
          "mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-[12px] transition-all duration-500",
          done ? "[background:var(--g-accent)] text-[var(--accent-ink)] shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_40%,transparent)]" : "bg-[var(--field-bg)] text-mute shadow-[var(--field-in)]",
        )}
        aria-label={done ? "Done" : undefined}
      >
        {done ? <Check size={14} strokeWidth={2.2} /> : String(n).padStart(2, "0")}
      </span>
    </div>
  );
}
