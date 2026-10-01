"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PlayCorner.module.css";

const symbols = ["☾", "♡", "✿", "✦", "☀", "♫"];
function shuffle() { return [...symbols, ...symbols].map((symbol, id) => ({ symbol, id, sort: Math.random() })).sort((a, b) => a.sort - b.sort); }

function Pairs() {
  const [cards, setCards] = useState<ReturnType<typeof shuffle>>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  useEffect(() => { setCards(shuffle()); }, []);
  useEffect(() => {
    if (open.length !== 2) return;
    const timer = setTimeout(() => {
      if (cards[open[0]].symbol === cards[open[1]].symbol) setMatched(previous => [...previous, cards[open[0]].symbol]);
      setOpen([]);
    }, 750);
    return () => clearTimeout(timer);
  }, [open, cards]);
  const reset = () => { setCards(shuffle()); setOpen([]); setMatched([]); setMoves(0); };
  return <><p>Turn over two cards and find their partner. Take your time.</p><p role="status">{matched.length === 6 ? `All together again. You found every pair in ${moves} turns!` : `${matched.length} of 6 pairs · ${moves} turns`}</p>
    <div className={styles.pairs}>{cards.map((card, index) => {
      const visible = open.includes(index) || matched.includes(card.symbol);
      return <button key={card.id} className={visible ? styles.revealed : ""} disabled={visible || open.length === 2} aria-label={visible ? `${card.symbol}${matched.includes(card.symbol) ? ", matched" : ""}` : `Turn over card ${index + 1}`} onClick={() => { setOpen(previous => [...previous, index]); if (open.length === 1) setMoves(value => value + 1); }}>{visible ? card.symbol : "?"}</button>;
    })}</div><button className={styles.restart} onClick={reset}>Shuffle & play again</button></>;
}

const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function winner(board: string[]) { return lines.map(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c] ? board[a] : "").find(Boolean) || ""; }
function Noughts() {
  const [board, setBoard] = useState(Array<string>(9).fill(""));
  const [thinking, setThinking] = useState(false);
  const won = winner(board);
  const draw = !won && board.every(Boolean);
  useEffect(() => {
    if (!thinking || won || draw) return;
    const timer = setTimeout(() => {
      const empty = board.map((value, index) => value ? -1 : index).filter(index => index >= 0);
      const findMove = (mark: string) => empty.find(index => { const next = [...board]; next[index] = mark; return winner(next) === mark; });
      const choice = findMove("✦") ?? findMove("♡") ?? (board[4] ? empty[Math.floor(Math.random() * empty.length)] : 4);
      setBoard(previous => previous.map((value, index) => index === choice ? "✦" : value)); setThinking(false);
    }, 550);
    return () => clearTimeout(timer);
  }, [thinking, board, won, draw]);
  return <><p>You are the hearts. The computer plays stars. Get three in a row.</p><p role="status">{won === "♡" ? "You won! A little victory for your day." : won ? "The stars win this round. Rematch?" : draw ? "A perfect little tie." : thinking ? "The stars are choosing…" : "Your turn. Pick a square."}</p>
    <div className={styles.noughts}>{board.map((value, index) => <button key={index} disabled={Boolean(value || won || draw || thinking)} aria-label={`Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}: ${value || "empty"}`} onClick={() => { const next = [...board]; next[index] = "♡"; setBoard(next); setThinking(!winner(next) && next.some(cell => !cell)); }}>{value}</button>)}</div>
    <button className={styles.restart} onClick={() => { setBoard(Array<string>(9).fill("")); setThinking(false); }}>New round</button></>;
}

function Constellation() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<"idle" | "show" | "play" | "lost" | "won">("idle");
  const [lit, setLit] = useState(-1);
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  const inputLock = useRef(false);
  useEffect(() => {
    if (phase !== "show") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    inputLock.current = true;
    sequence.forEach((star, index) => {
      timers.push(setTimeout(() => setLit(star), 450 + index * 1000));
      timers.push(setTimeout(() => setLit(-1), 1150 + index * 1000));
    });
    timers.push(setTimeout(() => { setPhase("play"); inputLock.current = false; }, 450 + sequence.length * 1000));
    return () => timers.forEach(clearTimeout);
  }, [phase, sequence]);
  const start = () => { setSequence([Math.floor(Math.random() * 4)]); setStep(0); setRound(0); setLit(-1); setPhase("show"); };
  function choose(index: number) {
    if (phase !== "play" || inputLock.current) return;
    if (sequence[step] !== index) { inputLock.current = true; setPhase("lost"); return; }
    if (step + 1 === sequence.length) {
      inputLock.current = true; setRound(sequence.length); setStep(0);
      if (sequence.length === 8) setPhase("won");
      else { setSequence(previous => [...previous, Math.floor(Math.random() * 4)]); setPhase("show"); }
    } else setStep(value => value + 1);
  }
  return <><p>Watch the numbered stars, then tap them in the same order. Reach eight to complete your sky.</p><p role="status">{phase === "show" ? `Watch round ${sequence.length}…` : phase === "play" ? `Your turn: ${step} of ${sequence.length} stars` : phase === "won" ? "Eight constellations remembered. Your sky is complete!" : phase === "lost" ? `You completed ${round} rounds. Try another sky?` : "Ready to make a constellation?"}</p>
    <div className={styles.constellation}>{[0,1,2,3].map(index => <button key={index} className={lit === index ? styles.lit : ""} disabled={phase !== "play"} aria-label={`Star ${index + 1}${lit === index ? ", glowing" : ""}`} onClick={() => choose(index)}><span aria-hidden="true">✦</span>{index + 1}</button>)}</div>
    <button className={styles.restart} onClick={start}>{phase === "idle" ? "Start the stars" : "Start a new sky"}</button></>;
}

const games = [{ name: "Find our pairs", description: "Little things belong together", component: Pairs }, { name: "Hearts & stars", description: "A friendly hearts-and-stars match", component: Noughts }, { name: "Remember the sky", description: "Follow a growing constellation", component: Constellation }];
export default function PlayCorner() {
  const [selected, setSelected] = useState(0);
  const Game = games[selected].component;
  return <section id="play" className={styles.section} aria-labelledby="play-heading"><div className={styles.heading}><span aria-hidden="true">✧</span><h2 id="play-heading">Stay a little. Play a little.</h2><p>Three small ways to spend a happy moment here.</p></div>
    <div className={styles.layout}><nav className={styles.choices} aria-label="Choose a game">{games.map((game, index) => <button key={game.name} aria-pressed={selected === index} onClick={() => setSelected(index)}><strong>{game.name}</strong><span>{game.description}</span></button>)}</nav>
    <div className={styles.game}><h3>{games[selected].name}</h3><Game key={selected} /></div></div></section>;
}
