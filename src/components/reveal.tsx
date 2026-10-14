"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const variants = {
  up: "",
  left: "reveal-left",
  right: "reveal-right",
  scale: "reveal-scale",
  fade: "reveal-fade",
};

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: keyof typeof variants;
  style?: CSSProperties;
};

/** Fades/slides its children in the first time they scroll into view. */
export function Reveal({ children, className = "", delay = 0, variant = "up", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px 15% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${variants[variant]} ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}
