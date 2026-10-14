import type { SVGProps } from "react";
import type { ChainId } from "@/lib/data";

type P = { size?: number } & Omit<SVGProps<SVGSVGElement>, "width" | "height">;

const base = ({ size = 16, ...rest }: P): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  ...rest,
});

export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8.5l3.2 3L13 4.5" />
  </svg>
);
export const X = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);
export const Alert = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 2.8l5.6 9.8H2.4L8 2.8z" />
    <path d="M8 6.6v2.6M8 11h.01" />
  </svg>
);
export const Info = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.4v3.4M8 5.2h.01" />
  </svg>
);
export const ArrowUpRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 11L11 5M6 5h5v5" />
  </svg>
);
export const Bolt = (p: P) => (
  <svg {...base(p)}>
    <path d="M8.8 2L4 9h3.4l-.4 5L12 7H8.5l.3-5z" />
  </svg>
);
export const ChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);
export const ChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 4l4 4-4 4" />
  </svg>
);
export const Copy = (p: P) => (
  <svg {...base(p)}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 3.5a1.5 1.5 0 00-1.5-1.5H4a1.5 1.5 0 00-1.5 1.5V9A1.5 1.5 0 004 10.5" />
  </svg>
);
export const Grid = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
    <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
    <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
    <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
  </svg>
);
export const ImageIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="3" width="12" height="10" rx="2" />
    <circle cx="6" cy="6.6" r="1.1" />
    <path d="M2.6 11.4l3.2-3 3 2.6 2-1.8 2.6 2.2" />
  </svg>
);
export const Layers = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 2l5.5 3L8 8 2.5 5 8 2z" />
    <path d="M2.5 8L8 11l5.5-3M2.5 11L8 14l5.5-3" />
  </svg>
);
export const Moon = (p: P) => (
  <svg {...base(p)}>
    <path d="M13.5 9.4A5.8 5.8 0 016.6 2.5a5.8 5.8 0 106.9 6.9z" />
  </svg>
);
export const Sun = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1" />
  </svg>
);
export const Rocket = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.4 9.6L4 9l1.4-2.2C7 4.2 9.4 2.6 12.8 2.2c.3 3.4-1.2 5.9-3.6 7.6L7 11.2l-.6-1.6z" />
    <path d="M6.4 9.6l-2 2M5 13.2l-1.6.4.4-1.6" />
    <circle cx="10.2" cy="5.4" r="1" />
  </svg>
);
export const Shield = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 2l5 2v4.2c0 3-2.1 5.2-5 5.8-2.9-.6-5-2.8-5-5.8V4l5-2z" />
  </svg>
);
export const Wallet = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="4" width="12" height="9" rx="2" />
    <path d="M2 7h12M11 10h1.5" />
  </svg>
);
export const ArrowRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
export const Receipt = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 2h9v12l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1V2z" />
    <path d="M6 5.5h4M6 8h4M6 10.5h2" />
  </svg>
);
export const Sparkles = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 2.5l1.1 3.4 3.4 1.1-3.4 1.1-1.1 3.4-1.1-3.4L2 7l3.4-1.1 1.1-3.4z" />
    <path d="M12 10l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4L10 12l1.4-.6.6-1.4z" />
  </svg>
);
export const Help = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="6" />
    <path d="M6.3 6.2a1.8 1.8 0 013.5.6c0 1.2-1.8 1.5-1.8 2.6M8 11.2h.01" />
  </svg>
);
export const Book = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 3.2c1.8-.6 3.5-.4 5 .8 1.5-1.2 3.2-1.4 5-.8v9.6c-1.8-.6-3.5-.4-5 .8-1.5-1.2-3.2-1.4-5-.8V3.2z" />
    <path d="M8 4v9.6" />
  </svg>
);

/** The MirrorPad mark: a solid triangle. */
export const Logo = ({ size = 28 }: { size?: number }) => (
  <span
    className="grid shrink-0 place-items-center rounded-[9px] text-[var(--accent-ink)]"
    style={{
      width: size,
      height: size,
      background: "var(--g-accent)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), inset 0 -2px 0 rgba(0,0,0,.12), 0 8px 20px -8px rgba(150,200,40,.6)",
    }}
  >
    <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.6L14.4 13H1.6L8 1.6z" fill="currentColor" />
    </svg>
  </span>
);

export function ChainMark({ chain, size = 16 }: { chain: ChainId; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true, fill: "none" } as const;
  switch (chain) {
    case "solana":
      return (
        <svg {...p}>
          <path d="M5.2 16.4a.8.8 0 01.56-.24h13.1c.36 0 .54.43.28.68l-2.34 2.32a.8.8 0 01-.56.24H3.14c-.36 0-.54-.43-.28-.68l2.34-2.32z" fill="currentColor" />
          <path d="M5.2 4.6a.82.82 0 01.56-.24h13.1c.36 0 .54.43.28.68l-2.34 2.32a.8.8 0 01-.56.24H3.14c-.36 0-.54-.43-.28-.68L5.2 4.6z" fill="currentColor" opacity="0.72" />
          <path d="M16.8 10.47a.8.8 0 00-.56-.23H3.14c-.36 0-.54.42-.28.67l2.34 2.33c.15.15.35.23.56.23h13.1c.36 0 .54-.42.28-.67l-2.34-2.33z" fill="currentColor" opacity="0.86" />
        </svg>
      );
    case "base":
      return (
        <svg {...p}>
          <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z" fill="currentColor" opacity="0.16" />
          <path d="M11.9 20.5c4.7 0 8.5-3.8 8.5-8.5s-3.8-8.5-8.5-8.5c-4.46 0-8.12 3.43-8.47 7.8h11.24v1.4H3.43c.35 4.37 4.01 7.8 8.47 7.8z" fill="currentColor" />
        </svg>
      );
    case "bsc":
      return (
        <svg {...p}>
          <path
            d="M12 2.6l3.03 3.03L12 8.66 8.97 5.63 12 2.6zM5.63 8.97l3.03 3.03-3.03 3.03L2.6 12l3.03-3.03zm12.74 0L21.4 12l-3.03 3.03L15.34 12l3.03-3.03zM12 15.34l3.03 3.03L12 21.4l-3.03-3.03L12 15.34z"
            fill="currentColor"
          />
          <path d="M12 9.24L14.76 12 12 14.76 9.24 12 12 9.24z" fill="currentColor" opacity="0.7" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M4 19.5c1.1-6.2 4.6-11 10.2-13.4-2 2.3-3.2 4.6-3.8 7.1 2.3-2.6 5-4.2 8.2-4.8-1.4 6.3-5.9 10.4-11.6 11.1H4z" fill="currentColor" />
          <path d="M4 19.5c1.7-3 3.9-5.3 6.6-7" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
        </svg>
      );
  }
}
