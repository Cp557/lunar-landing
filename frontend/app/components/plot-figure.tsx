"use client";

import { useEffect, useRef } from "react";

/** The SVG returned by Plot.plot (our charts have no Plot legends, so it is always an <svg>). */
export type PlotElement = SVGSVGElement;

/** Renders an Observable Plot chart at the container's width; it is rebuilt only when `render` or the width changes. */
export function PlotFigure({ render, label }: { render: (width: number) => PlotElement; label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = 0;
    const draw = () => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      el.replaceChildren(render(width));
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    return () => observer.disconnect();
  }, [render]);

  return <div ref={ref} role="img" aria-label={label} className="w-full" />;
}
