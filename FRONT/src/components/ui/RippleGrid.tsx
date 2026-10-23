"use client";

import * as React from "react";
import { useAnimationFrame, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  usePalette,
  useResponsiveCanvas,
  dot,
  wire2,
  lerp2,
  type Palette,
} from "@/lib/_physics-shared";
import { useInViewRef } from "@/hooks/_hooks";

export interface RippleGridProps {
  columns?: number;
  rows?: number;
  nodeSize?: number;
  autoPlay?: boolean;
  autoInterval?: number;
  rippleDuration?: number;
  tapToRipple?: boolean;
  showControls?: boolean;
  hint?: string | null;
  aspect?: number | "fill";
  onRipple?: (origin: { x: number; y: number; source: "auto" | "user" }) => void;
  className?: string;
}

type Ripple = { x: number; y: number; age: number };

function getGrid(w: number, h: number, gw: number, gh: number) {
  const cell = Math.min(w / (gw + 1), h / (gh + 1));
  const ox = (w - (gw - 1) * cell) / 2;
  const oy = (h - (gh - 1) * cell) / 2;
  return { ox, oy, cell };
}

function RippleCanvas({
  palette,
  playing,
  columns,
  rows,
  nodeSize,
  autoInterval,
  rippleDuration,
  tapToRipple,
  reduced,
  aspect,
  onRipple,
}: {
  palette: Palette;
  playing: boolean;
  columns: number;
  rows: number;
  nodeSize: number;
  autoInterval: number;
  rippleDuration: number;
  tapToRipple: boolean;
  reduced: boolean;
  aspect?: number | "fill";
  onRipple?: RippleGridProps["onRipple"];
}) {
  const { wrapRef, canvasRef, getCtx, dims } = useResponsiveCanvas(aspect);
  const { ref: inViewRef, inView } = useInViewRef<HTMLDivElement>();
  const ripplesRef = React.useRef<Ripple[]>([]);
  const autoRef = React.useRef(0);
  // size signature of the last static (idle) frame drawn; 0 == needs redraw
  const staticDrawnRef = React.useRef(0);

  const spawn = React.useCallback(
    (x: number, y: number, source: "auto" | "user") => {
      ripplesRef.current.push({ x, y, age: 0 });
      staticDrawnRef.current = 0;
      onRipple?.({ x, y, source });
    },
    [onRipple],
  );

  const seededRef = React.useRef(false);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!tapToRipple) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { w, h } = dims.current;
      spawn(
        ((e.clientX - rect.left) / rect.width) * w,
        ((e.clientY - rect.top) / rect.height) * h,
        "user",
      );
    },
    [canvasRef, dims, spawn, tapToRipple],
  );

  useAnimationFrame((_, delta) => {
    const ctx = getCtx();
    if (!ctx) return;
    const { w, h } = dims.current;
    if (w === 0 || h === 0) return;
    if (!inView.current) return;
    // when idle (paused with no live ripples) the grid is static — draw once
    // per size, then skip redundant full redraws until something changes
    const idle = !playing && ripplesRef.current.length === 0;
    const sizeKey = idle ? w * 100000 + h : 0;
    if (idle && staticDrawnRef.current === sizeKey) return;
    const { ox, oy, cell } = getGrid(w, h, columns, rows);
    const maxDist = Math.hypot((columns - 1) * cell, (rows - 1) * cell);
    const waveSpeed = maxDist / (rippleDuration * 0.65);
    const { hi, lo, wire, fill } = palette;

    if (!seededRef.current && cell > 0 && !reduced) {
      seededRef.current = true;
      spawn(ox + 2 * cell, oy + 1 * cell, "auto");
    }

    if (playing) {
      autoRef.current += delta;
      if (autoRef.current > autoInterval) {
        autoRef.current = 0;
        const gc = Math.floor(Math.random() * columns);
        const gr = Math.floor(Math.random() * rows);
        spawn(ox + gc * cell, oy + gr * cell, "auto");
      }
    }

    const ageDelta = playing ? delta : delta * 3;
    ripplesRef.current = ripplesRef.current
      .map((r) => ({ ...r, age: r.age + ageDelta }))
      .filter((r) => r.age < rippleDuration);

    ctx.clearRect(0, 0, w, h);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = ox + col * cell;
        const y = oy + row * cell;
        if (col < columns - 1) wire2(ctx, x, y, x + cell, y, wire);
        if (row < rows - 1) wire2(ctx, x, y, x, y + cell, wire);
      }
    }

    const peak = palette.isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)";
    const nodeBase = Math.max(2.5, 2.8 * (w / 320)) * nodeSize;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = ox + col * cell;
        const y = oy + row * cell;

        let glow = 0;
        ripplesRef.current.forEach((r) => {
          const d = Math.hypot(x - r.x, y - r.y);
          const front = r.age * waveSpeed;
          const waveWidth = cell * 0.6;
          const diff = Math.abs(d - front);
          if (diff < waveWidth) {
            const crest = Math.pow(1 - diff / waveWidth, 2);
            const decay = Math.pow(1 - r.age / rippleDuration, 1.3);
            glow = Math.max(glow, crest * decay);
          }
        });

        const nodeR = nodeBase + glow * nodeBase * 0.65;
        const strokeColor =
          glow < 0.5 ? lerp2(lo, hi, glow * 2) : lerp2(hi, peak, (glow - 0.5) * 2);
        const fillColor =
          glow > 0.6 ? lerp2(fill, peak, (glow - 0.6) * 2.5) : fill;

        // canvas shadowBlur is one of the most expensive 2D ops; running it
        // for up to rows*cols nodes every frame drops frames on larger grids.
        // Draw a cheap additive radial halo instead.
        if (glow > 0.05) {
          const haloR = nodeR + glow * 14;
          const g = ctx.createRadialGradient(x, y, nodeR, x, y, haloR);
          const a = palette.isDark ? glow * 0.5 : glow * 0.4;
          g.addColorStop(
            0,
            palette.isDark ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`,
          );
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, haloR, 0, Math.PI * 2);
          ctx.fill();
        }

        dot(ctx, x, y, nodeR, fillColor, strokeColor, glow > 0.05 ? 0.9 : 0.45);
      }
    }

    staticDrawnRef.current = sizeKey;
  });

  return (
    <div
      ref={(node) => {
        wrapRef.current = node;
        inViewRef.current = node;
      }}
      className={cn("w-full", aspect === "fill" && "h-full")}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        role="img"
        aria-label="Grid of dots with ripples pulsing across it"
        style={{ display: "block", cursor: tapToRipple ? "crosshair" : "default" }}
      />
    </div>
  );
}

export function RippleGrid({
  columns = 6,
  rows = 4,
  nodeSize = 1,
  autoPlay = true,
  autoInterval = 2600,
  rippleDuration = 2400,
  tapToRipple = true,
  showControls = true,
  hint,
  aspect,
  onRipple,
  className,
}: RippleGridProps = {}) {
  const palette = usePalette();
  const reduced = !!useReducedMotion();
  const [playing, setPlaying] = React.useState(autoPlay && !reduced);

  React.useEffect(() => {
    setPlaying(autoPlay && !reduced);
  }, [autoPlay, reduced]);

  const hintLabel =
    hint === null
      ? null
      : hint ?? (playing ? (tapToRipple ? "Tap to ripple" : "Auto") : "Paused");

  return (
    <div
      className={cn(
        "relative w-full select-none",
        aspect === "fill" && "h-full",
        className,
      )}
    >
      <RippleCanvas
        palette={palette}
        playing={playing}
        columns={columns}
        rows={rows}
        nodeSize={nodeSize}
        autoInterval={autoInterval}
        rippleDuration={rippleDuration}
        tapToRipple={tapToRipple}
        reduced={reduced}
        aspect={aspect}
        onRipple={onRipple}
      />

      {hintLabel ? (
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500/25 dark:text-zinc-400/25">
          {hintLabel}
        </span>
      ) : null}

      {showControls ? (
        <button
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause ripples" : "Play ripples"}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-zinc-200/30 dark:border-zinc-800/30 bg-white/60 dark:bg-zinc-950/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500/50 dark:text-zinc-400/50 backdrop-blur-sm transition-[border-color,color] hover:border-zinc-200/50 dark:hover:border-zinc-800/50 hover:text-zinc-900/70 dark:hover:text-zinc-100/70"
        >
          {playing ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
          {playing ? "Pause" : "Play"}
        </button>
      ) : null}
    </div>
  );
}
