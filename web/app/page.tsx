"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { content } from "@/lib/content";

const AuraScene = dynamic(() => import("@/components/AuraScene"), { ssr: false });

const stars = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 47 + 13) % 100}%`,
  top: `${(i * 31 + 7) % 94}%`,
  delay: `${(i % 7) * 0.42}s`,
}));

function FallbackBuddy() {
  return (
    <>
      <div className="fallback-shadow" aria-hidden="true" />
      <div className="buddy-fallback" aria-hidden="true">
        <span className="fallback-cheek" />
        <span className="fallback-smile" />
      </div>
    </>
  );
}

export default function Home() {
  const [open, setOpen] = useState(false);
  const [canUseWebGL, setCanUseWebGL] = useState(false);
  const [visualReady, setVisualReady] = useState(false);
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setCanUseWebGL(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setCanUseWebGL(false);
    }
    setVisualReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const dialog = document.getElementById("birthday-letter");
        const focusable = dialog?.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      openRef.current?.focus();
    };
  }, [open]);

  const show3D = visualReady && canUseWebGL && !reduceMotion;

  return (
    <main className="universe">
      <div className="starfield" aria-hidden="true">
        {stars.map((star, i) => <span className="star" key={i} style={{ left: star.left, top: star.top, animationDelay: star.delay }} />)}
      </div>
      <div className="portal">
        <header className="topline">
          <span className="brand"><span className="brand-mark" aria-hidden="true" /> Aura</span>
          <Link className="topline-note" href="/control">Connect your desk buddy →</Link>
        </header>
        <section className="hero" aria-labelledby="birthday-heading">
          <div className="hero-copy">
            <h1 id="birthday-heading">Happy birthday<span>{content.petName}.</span></h1>
            <p className="intro">I kept a little note here for you. Come closer and open it whenever you&apos;re ready.</p>
          </div>
          <div className="scene-wrap" role="img" aria-label="Aura, a floating little companion with a heart">
            {show3D ? <AuraScene /> : <FallbackBuddy />}
          </div>
          <div className="invitation">
            <button className="open-button" ref={openRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">
              Open your letter <span aria-hidden="true">♡</span>
            </button>
            <p className="hint">A small birthday surprise, just for you</p>
          </div>
        </section>
        <footer className="footer">Made with love, from {content.sender}</footer>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="letter-scrim"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          >
            <motion.article
              id="birthday-letter"
              className="letter"
              role="dialog"
              aria-modal="true"
              aria-labelledby="letter-heading"
              initial={reduceMotion ? false : { opacity: 0, y: 25, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              <button ref={closeRef} className="close-button" type="button" onClick={() => setOpen(false)} aria-label="Close letter">×</button>
              <span className="letter-kicker">A letter for {content.recipient}</span>
              <h2 id="letter-heading">For you, {content.petName}</h2>
              <div className="letter-body">{content.letter}</div>
              <p className="signature">With love,<br />{content.sender}</p>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
