/** Shared SVG gradients and filters referenced by url(#lg…) across the page. Render once. */
export function LiquidGlassDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <linearGradient id="lgChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2F5E6" />
          <stop offset="15%" stopColor="#C4C8B8" />
          <stop offset="33%" stopColor="#3E4238" />
          <stop offset="50%" stopColor="#0B0C0E" />
          <stop offset="64%" stopColor="#4A4E42" />
          <stop offset="79%" stopColor="#D4D8C6" />
          <stop offset="90%" stopColor="#B5CF7A" />
          <stop offset="100%" stopColor="#E3F2B0" />
        </linearGradient>
        <linearGradient id="lgCrystal" x1="0.15" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#F7F8F0" />
          <stop offset="26%" stopColor="#DADDCC" />
          <stop offset="48%" stopColor="#8A8F80" />
          <stop offset="62%" stopColor="#2E3129" />
          <stop offset="82%" stopColor="#B9D27E" />
          <stop offset="100%" stopColor="#EEF6D2" />
        </linearGradient>
        <linearGradient id="lgRim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EEF9CF" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#C5F24A" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#E3F2B0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFF2D5" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="lgSpec" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C5F24A" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#9BC832" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <filter id="lgMorphSoft" x="-35%" y="-35%" width="170%" height="170%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves={2} seed={4} result="noise">
            <animate attributeName="baseFrequency" dur="14s" values="0.008 0.012;0.013 0.009;0.008 0.012" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={7} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="lgAmbient" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
    </svg>
  );
}

/** A glassy ellipse drawn inside an existing <svg>. `dim` fades it for a chain that's off. */
export function GlassBlob({ cx, cy, r = 46, dim = false }: { cx: number; cy: number; r?: number; dim?: boolean }) {
  return (
    <g filter="url(#lgMorphSoft)" opacity={dim ? 0.32 : 1} style={{ transition: "opacity .5s" }}>
      <ellipse cx={cx} cy={cy} rx={r + 10} ry={r + 10} fill="url(#lgGlow)" filter="url(#lgAmbient)" />
      <ellipse cx={cx} cy={cy} rx={r} ry={r} fill="url(#lgCrystal)" />
      <ellipse cx={cx} cy={cy} rx={r} ry={r} fill="none" stroke="url(#lgRim)" strokeWidth="1.6" opacity="0.6" />
      <ellipse cx={cx - r * 0.24} cy={cy - r * 0.42} rx={r * 0.42} ry={r * 0.2} fill="url(#lgSpec)" opacity="0.85" transform={`rotate(-24 ${cx} ${cy})`} />
    </g>
  );
}
