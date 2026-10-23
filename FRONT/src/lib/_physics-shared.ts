export type Palette = {
  hi: string;
  mid: string;
  lo: string;
  wire: string;
  fill: string;
  trailRgb: string;
  shadowRgb: string;
  isDark: boolean;
};

export const DARK: Palette = {
  hi: "rgba(212,218,228,1)",
  mid: "rgba(130,134,142,1)",
  lo: "rgba(54,57,64,1)",
  wire: "rgba(30,33,40,1)",
  fill: "rgba(8,9,10,1)",
  trailRgb: "212,218,228",
  shadowRgb: "180,190,210",
  isDark: true,
};

export const LIGHT: Palette = {
  hi: "rgba(20,20,36,1)",
  mid: "rgba(100,102,118,1)",
  lo: "rgba(195,196,208,1)",
  wire: "rgba(218,220,228,1)",
  fill: "rgba(252,252,254,1)",
  trailRgb: "20,20,36",
  shadowRgb: "40,40,80",
  isDark: false,
};

import * as React from "react";

function readIsDark(): boolean {
  if (typeof document === "undefined") return true;
  const classes = document.documentElement.classList;
  if (classes.contains("dark")) return true;
  if (classes.contains("light")) return false;
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function usePalette(): Palette {
  const [dark, setDark] = React.useState(true);
  React.useEffect(() => {
    const sync = () => setDark(readIsDark());
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const mql =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    mql?.addEventListener("change", sync);
    return () => {
      obs.disconnect();
      mql?.removeEventListener("change", sync);
    };
  }, []);
  return dark ? DARK : LIGHT;
}

const ASPECT = 320 / 220;

export function useResponsiveCanvas(
  aspect: number | "fill" = ASPECT,
  onResize?: () => void,
) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dpr = React.useRef(1);
  const dims = React.useRef({ w: 320, h: 220 });
  const onResizeRef = React.useRef(onResize);
  React.useLayoutEffect(() => {
    onResizeRef.current = onResize;
  });

  React.useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const apply = () => {
      const r = Math.min(window.devicePixelRatio || 1, 3);
      dpr.current = r;
      const w = wrap.clientWidth || 320;
      const h =
        aspect === "fill"
          ? wrap.clientHeight || Math.round(w / ASPECT)
          : Math.round(w / aspect);
      dims.current = { w, h };
      canvas.width = w * r;
      canvas.height = h * r;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      onResizeRef.current?.();
    };

    let mql: MediaQueryList | null = null;
    const onDprChange = () => {
      apply();
      watchDpr();
    };
    const watchDpr = () => {
      if (typeof window.matchMedia !== "function") return;
      mql?.removeEventListener("change", onDprChange);
      mql = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`,
      );
      mql.addEventListener("change", onDprChange);
    };

    apply();
    watchDpr();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      mql?.removeEventListener("change", onDprChange);
    };
  }, [aspect]);

  const getCtx = React.useCallback((): CanvasRenderingContext2D | null => {
    const c = canvasRef.current?.getContext("2d") ?? null;
    if (!c) return null;
    c.setTransform(dpr.current, 0, 0, dpr.current, 0, 0);
    return c;
  }, []);

  return { wrapRef, canvasRef, getCtx, dims };
}

export function dot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  fill: string, stroke: string, lineWidth: number
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.fill();
  ctx.stroke();
}

export function wire2(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number, color: string
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

export function lerp2(a: string, b: string, t: number): string {
  const pa = parseRgba(a);
  const pb = parseRgba(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  const al = pa[3] + (pb[3] - pa[3]) * t;
  return `rgba(${r},${g},${bl},${al})`;
}

function parseRgba(s: string): [number, number, number, number] {
  const m = s.match(/[\d.]+/g);
  if (!m || m.length < 3) return [0, 0, 0, 0];
  return [+m[0], +m[1], +m[2], m[3] !== undefined ? +m[3] : 1];
}
