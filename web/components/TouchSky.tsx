"use client";

import { useEffect, useRef } from "react";

interface AntigravityParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  baseAlpha: number;
  phase: number;
  pulseSpeed: number;
  colorRgb: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export default function TouchSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrameId = 0;
    let particles: AntigravityParticle[] = [];
    let shockwaves: Shockwave[] = [];

    // Pointer state with smooth damping
    const mouse = {
      x: -2000,
      y: -2000,
      targetX: -2000,
      targetY: -2000,
      active: false,
    };

    const palette = [
      "245, 182, 198", // romantic rose
      "215, 204, 232", // celestial lavender
      "251, 246, 238", // starlight cream
      "235, 194, 210", // soft blush
    ];

    const initParticles = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Adaptive particle density (55-80 on desktop, 35-45 on mobile)
      const count = width < 768 ? Math.floor(width * 0.09) : Math.floor(Math.min(width * 0.05, 80));

      particles = [];
      for (let i = 0; i < count; i++) {
        const baseSpeed = 0.15 + Math.random() * 0.25;
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          baseVx: Math.cos(angle) * baseSpeed,
          baseVy: Math.sin(angle) * baseSpeed,
          size: 1.2 + Math.random() * 1.8,
          baseAlpha: 0.35 + Math.random() * 0.45,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.015 + Math.random() * 0.02,
          colorRgb: palette[i % palette.length],
        });
      }
    };

    const handleResize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      initParticles();
    };

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      // Smooth pointer position lerp
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.14;
        mouse.y += (mouse.targetY - mouse.y) * 0.14;

        // Subtle ambient stardust aura centered at cursor
        const auraRadius = width < 768 ? 100 : 140;
        const aura = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          auraRadius
        );
        aura.addColorStop(0, "rgba(245, 182, 198, 0.07)");
        aura.addColorStop(0.5, "rgba(165, 156, 207, 0.03)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 1. Update & draw shockwaves (tap / click ripples)
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 4.5;
        sw.alpha *= 0.94;

        if (sw.alpha < 0.02 || sw.radius > sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = `rgba(245, 182, 198, ${sw.alpha * 0.45})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Push particles along the shockwave wavefront
        for (const p of particles) {
          const dx = p.x - sw.x;
          const dy = p.y - sw.y;
          const dist = Math.hypot(dx, dy);
          if (Math.abs(dist - sw.radius) < 22 && dist > 1) {
            const push = (sw.alpha * 1.8) / dist;
            p.vx += dx * push;
            p.vy += dy * push;
          }
        }
      }

      // 2. Physics & Draw Particles
      const interactionRadius = width < 768 ? 110 : 155;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Cursor Antigravity field interaction
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);

          if (dist < interactionRadius && dist > 1) {
            const force = (1 - dist / interactionRadius) * 1.4;
            // Buoyant zero-gravity deflection
            p.vx += (dx / dist) * force * 0.55;
            p.vy += (dy / dist) * force * 0.55;

            // Constellation filament from particle to cursor
            const cursorAlpha = (1 - dist / interactionRadius) * 0.28;
            ctx.strokeStyle = `rgba(245, 182, 198, ${cursorAlpha})`;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // Particle-to-particle constellation filaments
        const filamentDistance = width < 768 ? 75 : 95;
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < filamentDistance) {
            const filamentAlpha = (1 - dist / filamentDistance) * 0.16;
            ctx.strokeStyle = `rgba(215, 204, 232, ${filamentAlpha})`;
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Apply velocity with smooth fluid damping
        p.vx *= 0.93;
        p.vy *= 0.93;

        p.x += p.baseVx + p.vx;
        p.y += p.baseVy + p.vy;

        // Wrap around viewport boundaries seamlessly
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Twinkling pulse
        p.phase += p.pulseSpeed;
        const pulse = 0.8 + Math.sin(p.phase) * 0.2;
        const currentAlpha = p.baseAlpha * pulse;

        // Render particle
        ctx.fillStyle = `rgba(${p.colorRgb}, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (reducedMotion.matches || document.hidden) return;
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      if (!mouse.active) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
      }
    };

    const handlePointerLeave = () => {
      mouse.active = false;
      mouse.targetX = -2000;
      mouse.targetY = -2000;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (reducedMotion.matches || document.hidden) return;
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 12,
        maxRadius: window.innerWidth < 768 ? 140 : 200,
        alpha: 0.65,
      });
      // Limit concurrent shockwaves
      if (shockwaves.length > 5) shockwaves.shift();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="touch-sky" aria-hidden="true" />;
}
