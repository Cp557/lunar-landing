"use client";

import { useEffect, useRef } from "react";

/** Renders an Observable Plot chart at the container's width, redrawing on resize. */
export function PlotFigure({ render }: { render: (width: number) => Element }) {
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

  return <div ref={ref} className="w-full" />;
}
