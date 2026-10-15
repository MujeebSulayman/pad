"use client";

import { useEffect, useRef } from "react";

const CELL_SIZE = 11;
const TICK_MS = 140;
const GLIDER = [
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 1],
];

function stamp(grid: Uint8Array, cols: number, rows: number, pattern: number[][], x: number, y: number) {
  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < pattern[r].length; c++) {
      if (!pattern[r][c]) continue;
      const row = (y + r + rows) % rows;
      const col = (x + c + cols) % cols;
      grid[row * cols + col] = 1;
    }
  }
}

/** Conway's Game of Life on a wrapping grid, coloured by the --life-cell theme variable. */
export function LifeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cols = 0;
    let rows = 0;
    let grid = new Uint8Array();
    let next = new Uint8Array();
    let frame = 0;
    let lastTick = 0;
    let running = true;

    const cellColor = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--life-cell").trim() ||
      "rgba(201,206,214,0.32)";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(8, Math.floor(w / CELL_SIZE));
      rows = Math.max(8, Math.floor(h / CELL_SIZE));
      grid = new Uint8Array(cols * rows);
      next = new Uint8Array(cols * rows);
      for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.16 ? 1 : 0;
      stamp(grid, cols, rows, GLIDER, 4, 4);
      stamp(grid, cols, rows, GLIDER, Math.floor(cols * 0.62), Math.floor(rows * 0.28));
      stamp(grid, cols, rows, GLIDER, Math.floor(cols * 0.38), Math.floor(rows * 0.7));
    };

    const step = () => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let neighbours = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dc === 0 && dr === 0) continue;
              neighbours += grid[((r + dr + rows) % rows) * cols + ((c + dc + cols) % cols)];
            }
          }
          const alive = grid[r * cols + c] === 1;
          next[r * cols + c] = (alive && (neighbours === 2 || neighbours === 3)) || (!alive && neighbours === 3) ? 1 : 0;
        }
      }
      [grid, next] = [next, grid];
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = cellColor();
      const cw = w / cols;
      const ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r * cols + c]) ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
        }
      }
    };

    const loop = (time: number) => {
      if (!running) return;
      if (!lastTick || time - lastTick >= TICK_MS) {
        if (!reducedMotion) step();
        draw();
        lastTick = time;
      }
      frame = requestAnimationFrame(loop);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    draw();
    if (!reducedMotion) frame = requestAnimationFrame(loop);

    // Redraw with the new colour when the theme switches.
    const themeObserver = new MutationObserver(() => draw());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
