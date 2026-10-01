"use client";

import { useEffect, useRef, useState } from "react";

export default function TouchSky() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    if (!surface || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dots: { x: number; y: number; life: number; dx: number; dy: number }[] = [];
    let frame = 0;
    let last = 0;
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = innerWidth * scale; surface.height = innerHeight * scale;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      dots = [];
    };
    const draw = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      dots = dots.filter(dot => dot.life > 0);
      for (const dot of dots) {
        dot.life -= 0.025; dot.x += dot.dx; dot.y += dot.dy;
        ctx.fillStyle = `rgba(245,182,198,${Math.max(0, dot.life) * .6})`;
        ctx.beginPath(); ctx.arc(dot.x, dot.y, 1 + dot.life * 2, 0, Math.PI * 2); ctx.fill();
      }
      frame = dots.length ? requestAnimationFrame(draw) : 0;
    };
    const sparkle = (event: PointerEvent) => {
      if (reduced.matches || document.hidden) return;
      if (event.type === "pointermove" && performance.now() - last < 35) return;
      last = performance.now();
      const count = event.type === "pointerdown" ? 14 : 2;
      for (let i = 0; i < count; i++) dots.push({ x: event.clientX, y: event.clientY, life: 1, dx: (Math.random() - .5) * 2.5, dy: (Math.random() - .5) * 2.5 });
      dots = dots.slice(-100);
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const clear = () => { cancelAnimationFrame(frame); frame = 0; dots = []; ctx.clearRect(0, 0, innerWidth, innerHeight); };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", sparkle, { passive: true });
    window.addEventListener("pointerdown", sparkle, { passive: true });
    document.addEventListener("visibilitychange", clear);
    reduced.addEventListener("change", clear);
    return () => { clear(); window.removeEventListener("resize", resize); window.removeEventListener("pointermove", sparkle); window.removeEventListener("pointerdown", sparkle); document.removeEventListener("visibilitychange", clear); reduced.removeEventListener("change", clear); };
  }, [enabled]);
  return <><canvas ref={canvas} className="touch-sky" aria-hidden="true" /><button className="sky-toggle" aria-pressed={enabled} onClick={() => setEnabled(value => !value)}>Starlight {enabled ? "on" : "off"}</button></>;
}
