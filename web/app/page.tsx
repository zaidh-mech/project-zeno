"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { content } from "@/lib/content";
import MemoryGallery from "@/components/MemoryGallery";
import { useCompanionEnabled } from "@/lib/site-settings";
import TouchSky from "@/components/TouchSky";
import PlayCorner from "@/components/PlayCorner";
import KeepsakeIntro from "@/components/KeepsakeIntro";
import TogetherCards from "@/components/TogetherCards";

const AuraScene = dynamic(() => import("@/components/AuraScene"), { ssr: false });
const CompanionPet = dynamic(() => import("@/components/CompanionPet"), { ssr: false });

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
  const companionEnabled = useCompanionEnabled();
  const [open, setOpen] = useState(false);
  const [letterIndex, setLetterIndex] = useState(0);
  const [choosingLetter, setChoosingLetter] = useState(true);
  const [canUseWebGL, setCanUseWebGL] = useState(false);
  const [visualReady, setVisualReady] = useState(false);
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const letterScrollRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!companionEnabled) return;
    try {
      const canvas = document.createElement("canvas");
      setCanUseWebGL(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setCanUseWebGL(false);
    }
    setVisualReady(true);
  }, [companionEnabled]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (!choosingLetter) {
        if (event.key === "ArrowRight") setLetterIndex((index) => Math.min(index + 1, content.letters.length - 1));
        if (event.key === "ArrowLeft") setLetterIndex((index) => Math.max(index - 1, 0));
      }
      if (event.key === "Tab") {
        const dialog = document.getElementById("letter-deck");
        const focusable = dialog?.querySelectorAll<HTMLElement>("button:not([disabled]), select, a[href], [tabindex]:not([tabindex='-1'])");
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
  }, [open, choosingLetter]);

  useEffect(() => { letterScrollRef.current?.scrollTo({ top: 0, behavior: "instant" }); }, [letterIndex, choosingLetter]);

  const show3D = visualReady && canUseWebGL && !reduceMotion;

  return (
    <main className="universe">
      <TouchSky />
      <div className="starfield" aria-hidden="true">
        {stars.map((star, i) => <span className="star" key={i} style={{ left: star.left, top: star.top, animationDelay: star.delay }} />)}
      </div>
      <div className="portal">
        <div className="first-screen">
        <header className="topline">
          <span className="brand">{companionEnabled ? "Aura" : "Just for you"}</span>
          {companionEnabled && <Link className="topline-note" href="/control">Connect your desk buddy →</Link>}
        </header>
        <KeepsakeIntro buttonRef={openRef} isOpen={open} onOpen={() => { setLetterIndex(0); setChoosingLetter(true); setOpen(true); }} />
        {companionEnabled && <div className="hero"><div className="scene-wrap" role="img" aria-label="Aura, a floating little companion with a heart">{show3D ? <AuraScene /> : <FallbackBuddy />}</div><CompanionPet /></div>}
        </div>
        <MemoryGallery />
        <TogetherCards />
        <PlayCorner />
        <footer className="footer">Made with love, from {content.sender}</footer>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="letter-scrim"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
          >
            <motion.article
              id="letter-deck"
              className="letter-deck"
              role="dialog"
              aria-modal="true"
              aria-labelledby="letter-heading"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: reduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className="letter-deck-header">
                <span className="letter-deck-brand">Letters for {content.recipient}</span>
                <button ref={closeRef} className="close-button" type="button" onClick={() => setOpen(false)} aria-label="Close letters">×</button>
              </header>
              <div className="letter-stage" onTouchStart={(event) => { swipeStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={(event) => {
                const start = swipeStart.current;
                swipeStart.current = null;
                if (!start || choosingLetter) return;
                const dx = event.changedTouches[0].clientX - start.x;
                const dy = event.changedTouches[0].clientY - start.y;
                if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
                setLetterIndex((index) => Math.max(0, Math.min(content.letters.length - 1, index + (dx < 0 ? 1 : -1))));
              }}>
                <div className="letter-scroll" ref={letterScrollRef}>
                  {choosingLetter ? <div className="letter-collection">
                    <h2 id="letter-heading">A little stack of love.</h2>
                    <p>Pick the words you need today.</p>
                    <div className="letter-card-stack">
                      {content.letters.map((letter, index) => <button className="letter-choice-card" key={index} onClick={() => { setLetterIndex(index); setChoosingLetter(false); }} aria-label={`Read letter ${index + 1}: ${letter.title}`}>
                        <span className="letter-card-number">Letter {String(index + 1).padStart(2, "0")}</span>
                        <span className="letter-card-title">{letter.title}</span>
                        <span className="letter-card-seal" aria-hidden="true">♡</span>
                      </button>)}
                    </div>
                  </div> : <div className="letter-paper" key={letterIndex}>
                    <span className="letter-kicker">Letter {letterIndex + 1} of {content.letters.length}</span>
                    <h2 id="letter-heading">{content.letters[letterIndex].title}</h2>
                    <div className="letter-body">{content.letters[letterIndex].body}</div>
                    <p className="signature">With love,<br />{content.sender}</p>
                  </div>}
                </div>
              </div>
              <nav className="letter-deck-nav" aria-label="Browse letters">
                {choosingLetter ? <p className="letter-stack-hint">{content.letters.length} letters, always here for you</p> : <>
                  <button type="button" onClick={() => setLetterIndex((index) => index - 1)} disabled={letterIndex === 0}>Previous</button>
                  <button className="letter-stack-return" type="button" onClick={() => setChoosingLetter(true)}>Letter stack</button>
                  <button type="button" onClick={() => setLetterIndex((index) => index + 1)} disabled={letterIndex === content.letters.length - 1}>Next letter</button>
                </>}
              </nav>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
