"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { content } from "@/lib/content";
import styles from "./KeepsakeIntro.module.css";

interface KeepsakeIntroProps {
  onOpen: () => void;
  buttonRef: Ref<HTMLButtonElement>;
  isOpen?: boolean;
}

export default function KeepsakeIntro({ onOpen, buttonRef, isOpen = false }: KeepsakeIntroProps) {
  const [unsealing, setUnsealing] = useState(false);
  const keepsakesRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Reset unsealing state when letter deck closes
  useEffect(() => {
    if (!isOpen) {
      setUnsealing(false);
    }
  }, [isOpen]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = keepsakesRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: Math.max(-1, Math.min(1, x * 2)),
      y: Math.max(-1, Math.min(1, y * 2)),
    });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const triggerOpen = () => {
    if (unsealing || isOpen) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onOpen();
      return;
    }
    setUnsealing(true);
    // Smooth cinematic unsealing before opening the letter deck
    const timer = setTimeout(() => {
      onOpen();
    }, 550);
    return () => clearTimeout(timer);
  };

  return (
    <section className={styles.hero} aria-labelledby="birthday-heading">
      <div className={styles.copy}>
        <div className={styles.dedicationBadge}>
          <span className={styles.dedicationSparkle} aria-hidden="true">✦</span>
          <p className={styles.dedication}>A little world, made for you</p>
        </div>

        <h1 id="birthday-heading">
          Happy birthday,<br />
          <span className={styles.petNameHighlight}>{content.petName}.</span>
        </h1>

        <p className={styles.intro}>
          Some feelings became letters.<br />
          Some moments became memories.<br />
          I kept them all here, for you.
        </p>

        <div className={styles.actions}>
          <button
            ref={buttonRef}
            onClick={triggerOpen}
            aria-haspopup="dialog"
            aria-expanded={isOpen || unsealing}
            className={styles.openLettersBtn}
          >
            <span>Read your letters</span>
            <span className={styles.btnHeart} aria-hidden="true">♡</span>
          </button>
          <a href="#album" className={styles.albumLink}>
            <span>Open our album</span>
            <span className={styles.btnArrow} aria-hidden="true">→</span>
          </a>
        </div>

        <p className={styles.signature}>With love, {content.sender}</p>
      </div>

      <div
        ref={keepsakesRef}
        className={styles.keepsakes}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          "--tilt-x": tilt.x,
          "--tilt-y": tilt.y,
        } as React.CSSProperties}
      >
        <span className={styles.orbit} aria-hidden="true" />
        <span className={styles.scribble} aria-hidden="true">
          all my favorite things<br />begin with you.
        </span>

        {/* 3D Envelope */}
        <button
          className={`${styles.envelope} ${unsealing || isOpen ? styles.unsealed : ""}`}
          onClick={triggerOpen}
          aria-label={`Open your collection of ${content.letters.length} letters`}
          aria-haspopup="dialog"
          aria-expanded={isOpen || unsealing}
          type="button"
        >
          <div className={styles.envelopeBack} aria-hidden="true" />

          {/* Letter Paper inside */}
          <span className={styles.paper}>
            <span className={styles.paperHeader}>
              <small>{content.letters.length} letters for you</small>
              <span className={styles.paperMiniSeal} aria-hidden="true">✦</span>
            </span>
            <strong>
              For the days<br />
              you need a<br />
              little love.
            </strong>
            <span className={styles.inkLines} aria-hidden="true" />
          </span>

          {/* Front Pocket */}
          <div className={styles.pocket} aria-hidden="true">
            <span className={styles.pocketTag}>To: my favorite person</span>
          </div>

          {/* Triangular Top Flap with Embossed Wax Seal */}
          <div className={styles.flap} aria-hidden="true">
            <span className={styles.flapFoil} />
            <div className={styles.waxSeal}>
              <span className={styles.waxHeart}>♡</span>
            </div>
          </div>
        </button>

        {/* Polaroid Memory */}
        <a className={styles.polaroid} href="#album" aria-label="Open our private memory album">
          <span className={styles.tape} aria-hidden="true" />
          <span className={styles.picture} aria-hidden="true">
            <svg viewBox="0 0 200 220" role="presentation">
              <rect width="200" height="220" fill="#57506e" />
              <circle cx="140" cy="55" r="27" fill="#f0ddc9" />
              <path d="M0 158 Q45 103 100 154 T220 137 V220 H0Z" fill="#898098" />
              <path d="M0 185 Q55 136 122 179 T220 169 V220 H0Z" fill="#b8a4b3" />
              <path d="M0 209 Q75 168 140 211 T220 196 V220 H0Z" fill="#d8bbc6" />
              <g fill="#f5e4df">
                <circle cx="35" cy="45" r="2" />
                <circle cx="75" cy="79" r="1.5" />
                <circle cx="167" cy="111" r="2" />
              </g>
            </svg>
            <span>you & me</span>
          </span>
          <strong>Our little collection.</strong>
          <small>Memories, safely tucked away ♡</small>
        </a>

        <span className={styles.caption}>A letter to open. A moment to keep.</span>
      </div>

      <nav className={styles.trail} aria-label="Explore this little world">
        <a href="#album">Our memories</a>
        <span aria-hidden="true">✧</span>
        <a href="#together">A moment together</a>
        <span aria-hidden="true">✧</span>
        <a href="#play">A little play</a>
      </nav>
    </section>
  );
}
