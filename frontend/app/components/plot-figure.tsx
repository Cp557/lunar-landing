"use client";

import { useEffect, useRef } from "react";

/** Renders an Observable Plot chart at the container's width, redrawing on resize. */
export function PlotFigure({ render, label }: { render: (width: number) => Element; label: string }) {
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
