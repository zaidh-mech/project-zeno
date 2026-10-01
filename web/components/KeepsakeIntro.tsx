"use client";

import type { Ref } from "react";
import { content } from "@/lib/content";
import styles from "./KeepsakeIntro.module.css";

export default function KeepsakeIntro({ onOpen, buttonRef }: { onOpen: () => void; buttonRef: Ref<HTMLButtonElement> }) {
  return <section className={styles.hero} aria-labelledby="birthday-heading">
    <div className={styles.copy}>
      <p className={styles.dedication}>A little world, made for you.</p>
      <h1 id="birthday-heading">Happy birthday,<br />{content.petName}.</h1>
      <p className={styles.intro}>Some feelings became letters.<br />Some moments became memories.<br />I kept them all here, for you.</p>
      <div className={styles.actions}><button ref={buttonRef} onClick={onOpen} aria-haspopup="dialog">Read your letters <span aria-hidden="true">♡</span></button><a href="#album">Open our album</a></div>
      <p className={styles.signature}>With love, {content.sender}</p>
    </div>
    <div className={styles.keepsakes}>
      <span className={styles.orbit} aria-hidden="true" />
      <span className={styles.scribble} aria-hidden="true">all my favorite things<br />begin with you.</span>
      <button className={styles.envelope} onClick={onOpen} aria-label={`Open your collection of ${content.letters.length} letters`} aria-haspopup="dialog">
        <span className={styles.paper}><small>{content.letters.length} letters for you</small><strong>For the days<br />you need a<br />little love.</strong><span className={styles.inkLines} /></span>
        <span className={styles.pocket}><span>To: my favorite person</span><i aria-hidden="true">♡</i></span>
      </button>
      <a className={styles.polaroid} href="#album" aria-label="Open our PIN-protected memory album">
        <span className={styles.tape} aria-hidden="true" />
        <span className={styles.picture} aria-hidden="true"><svg viewBox="0 0 200 220" role="presentation"><rect width="200" height="220" fill="#57506e"/><circle cx="140" cy="55" r="27" fill="#f0ddc9"/><path d="M0 158 Q45 103 100 154 T220 137 V220 H0Z" fill="#898098"/><path d="M0 185 Q55 136 122 179 T220 169 V220 H0Z" fill="#b8a4b3"/><path d="M0 209 Q75 168 140 211 T220 196 V220 H0Z" fill="#d8bbc6"/><g fill="#f5e4df"><circle cx="35" cy="45" r="2"/><circle cx="75" cy="79" r="1.5"/><circle cx="167" cy="111" r="2"/></g></svg><span>you & me</span></span>
        <strong>Our little collection.</strong><small>Memories, safely tucked away ♡</small>
      </a>
      <span className={styles.caption}>A letter to open. A moment to keep.</span>
    </div>
    <nav className={styles.trail} aria-label="Explore this little world"><a href="#album">Our memories</a><span aria-hidden="true">✧</span><a href="#together">A moment together</a><span aria-hidden="true">✧</span><a href="#play">A little play</a></nav>
  </section>;
}
