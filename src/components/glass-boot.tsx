"use client";

import { useEffect, useRef } from "react";
import { dropSpring, springTo, startGlass } from "@/lib/glass";

/** SVG filters for the refracting nav lens (Chromium). */
function LensDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <filter id="lgnav" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage id="lgmapA" x="0" y="0" width="100" height="100" preserveAspectRatio="none" result="map" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="src" />
        <feDisplacementMap in="src" in2="map" scale="46" xChannelSelector="R" yChannelSelector="G" result="dr" />
        <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r" />
        <feDisplacementMap in="src" in2="map" scale="40" xChannelSelector="R" yChannelSelector="G" result="dg" />
        <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g" />
        <feDisplacementMap in="src" in2="map" scale="34" xChannelSelector="R" yChannelSelector="G" result="db" />
        <feColorMatrix in="db" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b" />
        <feBlend in="r" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="b" mode="screen" />
      </filter>
      <filter id="lgnav1" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage id="lgmapB" x="0" y="0" width="100" height="100" preserveAspectRatio="none" result="map" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="src" />
        <feDisplacementMap in="src" in2="map" scale="40" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/**
 * Give every `.seg` a glass knob that springs to its pressed button,
 * without each segmented control having to manage it.
 */
function useSegKnobs() {
  useEffect(() => {
    const knobs = new Map<HTMLElement, HTMLSpanElement>();
    const place = (seg: HTMLElement, snap = false) => {
      let knob = knobs.get(seg);
      if (!knob) {
        knob = document.createElement("span");
        knob.className = "knob";
        knob.setAttribute("aria-hidden", "true");
        seg.prepend(knob);
        seg.classList.add("has-knob");
        knobs.set(seg, knob);
        snap = true;
      }
      const on = seg.querySelector<HTMLElement>(':scope > button[aria-pressed="true"]');
      if (!on || !on.offsetWidth) {
        knob.style.opacity = "0";
        return;
      }
      knob.style.opacity = "1";
      springTo(knob, knob, on.offsetLeft, on.offsetWidth, snap);
    };
    // Injecting a knob into server HTML React hasn't hydrated yet breaks hydration, so wait for its fiber.
    const hydrated = (el: HTMLElement) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
    let retry: ReturnType<typeof setTimeout> | undefined;
    const scan = () => {
      for (const [seg, knob] of knobs)
        if (!seg.isConnected) {
          dropSpring(knob);
          knobs.delete(seg);
        }
      let pending = false;
      document.querySelectorAll<HTMLElement>(".seg").forEach((s) => {
        if (!knobs.has(s) && !hydrated(s)) pending = true;
        else place(s);
      });
      clearTimeout(retry);
      if (pending) retry = setTimeout(scan, 120);
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
    const onResize = () => knobs.forEach((_, seg) => place(seg, true));
    window.addEventListener("resize", onResize);
    return () => {
      mo.disconnect();
      clearTimeout(retry);
      window.removeEventListener("resize", onResize);
    };
  }, []);
}

/** The liquid-glass backdrop and the motion that goes with it. Mount once, in the root layout. */
export function GlassBoot() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useSegKnobs();
  useEffect(() => (canvas.current ? startGlass(canvas.current) : undefined), []);
  return (
    <>
      <canvas id="lg" ref={canvas} aria-hidden />
      <LensDefs />
      <div className="bg-fallback" aria-hidden />
    </>
  );
}
