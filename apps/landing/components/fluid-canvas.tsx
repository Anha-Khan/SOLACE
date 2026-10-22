"use client";

import { useEffect, useRef } from "react";

export function FluidCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (typeof (window as any).fluidSimulation === "function") {
      (window as any).fluidSimulation(canvas);
      return;
    }
    const script = document.createElement("script");
    script.src = "/fluid.js";
    script.onload = () => {
      if (typeof (window as any).fluidSimulation === "function") {
        (window as any).fluidSimulation(canvas);
      }
    };
    document.body.appendChild(script);
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="fs-canvas" />;
}