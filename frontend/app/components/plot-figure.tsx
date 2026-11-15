"use client";

import { useEffect, useRef } from "react";

/** The SVG returned by Plot.plot (our charts have no Plot legends, so it is always an <svg>). */
export type PlotElement = SVGSVGElement & {
  scale(name: string): { apply(value: unknown): number; domain?: unknown[]; range?: number[] } | undefined;
};

const SVG_NS = "http://www.w3.org/2000/svg";

/** Empty, reusable <g> on top of a chart for cheap per-frame marks (cursor, markers). */
export function overlayLayer(plot: PlotElement): SVGGElement {
  let g = plot.querySelector<SVGGElement>("g[data-overlay]");
  if (!g) {
    g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("data-overlay", "");
    plot.append(g);
  }
  g.replaceChildren();
  return g;
}

export function svg(tag: string, attrs: Record<string, string | number>, text?: string): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * Renders an Observable Plot chart at the container's width. The chart is rebuilt only when
 * `render` changes or the width changes; `overlay` (e.g. a time cursor) is redrawn on its own,
 * so scrubbing doesn't rebuild thousands of marks.
 */
export function PlotFigure({
  render,
  overlay,
  label,
}: {
  render: (width: number) => PlotElement;
  overlay?: (plot: PlotElement) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const plotRef = useRef<PlotElement | null>(null);
  const overlayRef = useRef(overlay);

  useEffect(() => {
    overlayRef.current = overlay;
    if (plotRef.current) overlay?.(plotRef.current);
  }, [overlay]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = 0;
    const draw = () => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      const plot = render(width);
      el.replaceChildren(plot);
      plotRef.current = plot;
      overlayRef.current?.(plot);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    return () => observer.disconnect();
  }, [render]);

  return <div ref={ref} role="img" aria-label={label} className="w-full" />;
}
