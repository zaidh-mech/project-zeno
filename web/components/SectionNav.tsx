"use client";

import { useEffect, useState } from "react";
import styles from "./SectionNav.module.css";

const sections = [
  { id: "hero", label: "Letters & Keepsakes", symbol: "♡" },
  { id: "album", label: "Our Memories", symbol: "✦" },
  { id: "together", label: "Moments Together", symbol: "☾" },
  { id: "play", label: "Play Corner", symbol: "✧" },
];

export default function SectionNav() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { threshold: 0.5 }
    );

    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className={styles.nav} aria-label="Sections guide">
      <div className={styles.track}>
        {sections.map((s) => {
          const isCurrent = active === s.id;
          return (
            <button
              key={s.id}
              className={`${styles.dot} ${isCurrent ? styles.active : ""}`}
              onClick={() => scrollTo(s.id)}
              aria-label={`Jump to ${s.label}`}
              aria-current={isCurrent ? "true" : undefined}
              type="button"
            >
              <span className={styles.dotIndicator} />
              <span className={styles.symbol} aria-hidden="true">{s.symbol}</span>
              <span className={styles.tooltip}>{s.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
