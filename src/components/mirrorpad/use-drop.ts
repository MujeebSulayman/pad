"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { springTo } from "@/lib/glass";

/** A glass highlight that springs to the current item (`aria-current`), and to the hovered one. */
export function useDrop(key: string, current: string) {
  const host = useRef<HTMLElement>(null);
  const drop = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  const go = (a: HTMLElement | null | undefined, snap = false) => {
    const d = drop.current;
    if (!d) return;
    if (!a || !a.offsetWidth) {
      d.style.opacity = "0";
      return;
    }
    d.style.opacity = "1";
    springTo(key, d, a.offsetLeft, a.offsetWidth, snap || !placed.current);
    placed.current = true;
  };
  const active = () => host.current?.querySelector<HTMLElement>('[aria-current="page"]');

  useLayoutEffect(() => {
    go(active());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);
  useEffect(() => {
    const ro = new ResizeObserver(() => go(active(), true));
    if (host.current) ro.observe(host.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    host,
    drop,
    enter: (e: React.PointerEvent<HTMLElement>) => e.pointerType === "mouse" && go(e.currentTarget),
    leave: () => go(active()),
  };
}
