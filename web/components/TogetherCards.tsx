"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./TogetherCards.module.css";

const decks = [
  { name: "A little date", mark: "☾", intro: "Make an ordinary day feel like ours.", cards: [
    ["A two-song sunset", "Each choose one song, find a view of the evening sky, and listen together. Apart today? Press play at the same time on a call."],
    ["The living-room café", "Make each other a drink, put your phones aside, and pretend this is a café you just discovered. Stay for the long conversation."],
    ["A tiny taste test", "Pick three snacks you have never compared. Rate them separately, reveal your scores, and crown your very unofficial favorite."],
    ["Draw me badly", "Take two minutes to draw each other without looking at the paper. Swap portraits. Being terrible at it is part of the date."],
    ["A walk with no hurry", "Choose a short walk and find three things you would usually pass without noticing. Take turns pointing them out."],
    ["The imaginary getaway", "Choose a place you would love to visit together. Plan one morning there: breakfast, a walk, and one thing you would bring home."],
  ]},
  { name: "One good question", mark: "♡", intro: "Take turns. The small answers count too.", cards: [
    ["The moment you would keep", "If you could put one ordinary moment of ours in a tiny glass jar, which one would it be?"],
    ["A little more understood", "What is something you are excited about lately that you wish people asked you about?"],
    ["Your kind of comfort", "After a difficult day, what small thing makes you feel most cared for?"],
    ["A future tradition", "What is one little tradition you would like us to start, even if it sounds silly?"],
    ["The unseen thank-you", "What is something small I do that means more to you than I probably realize?"],
    ["The next chapter", "What is one thing you would love for us to learn or try together this year?"],
  ]},
  { name: "Make a memory", mark: "✧", intro: "A tiny mission for our next album page.", cards: [
    ["The same sky", "Each take a picture of the sky wherever you are. Compare the colors, then give the two photos a shared title."],
    ["A photo without faces", "Capture something that feels like us without putting either of us in the picture. Tell each other why you chose it."],
    ["Recreate a little moment", "Choose an old photo from our album. Recreate one detail: the pose, a drink, the place, or just the mood."],
    ["Our day in three frames", "Take one photo in the morning, one in the afternoon, and one at night. Find the story that joins them."],
    ["A postcard from today", "Take a photo of a tiny detail from your day and share it with a single sentence beginning: I thought of you when…"],
    ["The wonderfully imperfect one", "Take a playful photo together with no retakes. Give it the most dramatic title you can think of."],
  ]},
];

export default function TogetherCards() {
  const [deck, setDeck] = useState(0);
  const [card, setCard] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const answerInput = useRef<HTMLTextAreaElement>(null);
  const current = decks[deck];
  const answerKey = card === null ? "" : `${current.name}:${current.cards[card][0]}`;
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem("our-moments-answers-v1") || "{}");
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        setAnswers(Object.fromEntries(Object.entries(stored).filter(([, value]) => typeof value === "string")));
      }
    } catch { setSaved(false); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!answerKey || !ready) return;
    answerInput.current?.focus({ preventScroll: true });
    answerInput.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [answerKey, ready]);
  function answer(value: string) {
    const next = { ...answers, [answerKey]: value };
    setAnswers(next);
    try { localStorage.setItem("our-moments-answers-v1", JSON.stringify(next)); setSaved(true); }
    catch { setSaved(false); }
  }
  function draw() { setCard(previous => previous === null ? Math.floor(Math.random() * current.cards.length) : (previous + 1 + Math.floor(Math.random() * (current.cards.length - 1))) % current.cards.length); }
  return <section className={styles.section} id="together" aria-labelledby="together-title">
    <div className={styles.copy}><p className={styles.note}>For all the moments still to come</p><h2 id="together-title">Let’s make<br />another memory.</h2><p>A little date. A question we haven’t asked.<br />A reason to put another photo in our album.</p><div className={styles.choices} role="group" aria-label="Choose a kind of moment">{decks.map((item, index) => <button key={item.name} aria-pressed={index === deck} onClick={() => { setDeck(index); setCard(null); }}><span aria-hidden="true">{item.mark}</span>{item.name}</button>)}</div><a href="#album">Revisit a memory instead</a></div>
    <div className={styles.stack}><article className={styles.card}><span className={styles.mark} aria-hidden="true">{current.mark}</span><p className={styles.category}>{current.name}</p><div aria-live="polite" aria-atomic="true"><h3>{card === null ? "A moment, just for us." : current.cards[card][0]}</h3><p>{card === null ? current.intro : current.cards[card][1]}</p></div>
      {card !== null && <div className={styles.answer}>
        <label htmlFor="moment-answer">Type your answer here</label>
        <textarea ref={answerInput} id="moment-answer" key={answerKey} rows={4} disabled={!ready} value={answers[answerKey] || ""} onChange={event => answer(event.target.value)} placeholder={deck === 0 ? "Our plan, our favorite part, or what we would try…" : deck === 1 ? "Write what comes to your heart…" : "The story, the title, or the moment we want to keep…"} aria-describedby="answer-save-status" />
        <p id="answer-save-status" className={styles.saveStatus} role="status">{!ready ? "Loading your answer…" : saved ? "Answers save automatically on this device." : "Your answer is here for this visit. This browser could not save it for later."}</p>
      </div>}
      <button onClick={draw}>{card === null ? "Draw a card" : "Try another card"}</button><small>Do it together, or save the idea for your next call.</small></article></div>
  </section>;
}
