"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { openGithubAlbum, publishGithubAlbum, readGithubSettings, publishGithubSettings } from "@/lib/gallery-github";
import type { GalleryMemory } from "@/lib/gallery-reader";
import styles from "./MemoryGallery.module.css";
import online from "./OnlineGalleryAdmin.module.css";

const photoTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function OnlineGalleryAdmin() {
  const [tokenInput, setTokenInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [companionEnabled, setCompanionEnabled] = useState(false);
  const settingsSha = useRef("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [memories, setMemories] = useState<GalleryMemory[]>([]);
  const [deleting, setDeleting] = useState<{ id: string; kind: "photo" | "memory" } | null>(null);
  const token = useRef("");
  const pin = useRef("");
  const sha = useRef("");
  const confirmation = useRef<HTMLDialogElement>(null);

  useEffect(() => { if (deleting) confirmation.current?.showModal(); }, [deleting]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setStatus("");
    try {
      const album = await openGithubAlbum(tokenInput.trim(), pinInput);
      const settings = await readGithubSettings(tokenInput.trim());
      settingsSha.current = settings.sha; setCompanionEnabled(settings.enabled);
      token.current = tokenInput.trim(); pin.current = pinInput; sha.current = album.sha;
      setMemories(album.memories); setTokenInput(""); setPinInput(""); setSignedIn(true);
      setStatus("Signed in. Changes you publish here will update the visitor site automatically.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Couldn’t open the album."); }
    finally { setBusy(false); }
  }

  async function publish(next: GalleryMemory[], message: string) {
    if (busy) return false;
    setBusy(true); setStatus("Encrypting and publishing your album…");
    try {
      sha.current = await publishGithubAlbum(token.current, pin.current, sha.current, next);
      setMemories(next); setDirty(false);
      setStatus(`${message} GitHub Pages is updating the visitor site now; it usually takes about a minute.`);
      return true;
    } catch (error) { setStatus(error instanceof Error ? error.message : "Couldn’t publish. Try again."); return false; }
    finally { setBusy(false); }
  }

  async function toggleCompanion() {
    if (busy) return;
    setBusy(true); setStatus("Publishing the visitor setting…");
    try {
      const next = !companionEnabled;
      settingsSha.current = await publishGithubSettings(token.current, settingsSha.current, next);
      setCompanionEnabled(next);
      setStatus(`${next ? "Companion enabled" : "Companion hidden"}. The visitor site will update after GitHub Pages finishes deploying (usually about a minute).`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not publish the setting."); }
    finally { setBusy(false); }
  }

  function update(id: string, patch: Partial<GalleryMemory>) {
    setMemories(previous => previous.map(memory => memory.id === id ? { ...memory, ...patch } : memory));
    setDirty(true); setStatus("Unsaved writing. Choose Save writing to publish it.");
  }

  async function upload(id: string, file?: File) {
    if (!file) return;
    if (!photoTypes.includes(file.type) || file.size > 8 * 1024 * 1024) { setStatus("Choose a JPG, PNG, WebP or GIF smaller than 8 MB."); return; }
    const photo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Couldn’t read that photo.")); reader.readAsDataURL(file);
    }).catch((error) => { setStatus(error.message); return ""; });
    if (photo) await publish(memories.map(memory => memory.id === id ? { ...memory, photo } : memory), "Photo saved.");
  }

  async function deleteItem() {
    if (!deleting) return;
    const next = deleting.kind === "memory" ? memories.filter(memory => memory.id !== deleting.id)
      : memories.map(memory => memory.id === deleting.id ? { ...memory, photo: "" } : memory);
    if (await publish(next, deleting.kind === "memory" ? "Memory deleted." : "Photo deleted; the writing is kept.")) confirmation.current?.close();
  }

  async function signOut() {
    if (dirty && !(await publish(memories, "Writing saved."))) return;
    token.current = ""; pin.current = ""; sha.current = "";
    setMemories([]); setSignedIn(false); setStatus("");
  }

  return <section className={styles.gallery} aria-labelledby="admin-heading">
    <div className={styles.heading}><span className={styles.thread} aria-hidden="true">♡</span>
      <h1 id="admin-heading">Keep our memories here.</h1>
      <p>Add a photo, write what it means to you, and publish it for your person to see.</p>
    </div>
    {!signedIn ? <div className={styles.locked}>
      <div className={styles.stack} aria-hidden="true"><span /><span /><span>just us ♡</span></div>
      <form onSubmit={signIn} className={styles.pinForm}>
        <h2>Your private album studio.</h2>
        <label htmlFor="github-token">GitHub access token</label>
        <input className={styles.adminPassword} id="github-token" type="password" autoComplete="off" required value={tokenInput} onChange={event => setTokenInput(event.target.value)} placeholder="Paste your GitHub token" />
        <label htmlFor="admin-pin">Album PIN</label>
        <input id="admin-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} minLength={4} required value={pinInput} onChange={event => setPinInput(event.target.value.replace(/\D/g, ""))} placeholder="••••" />
        <p className={online.help}>Use a fine-grained token for <strong>project-zeno</strong> with <strong>Contents: read and write</strong>. It stays only in this tab until you sign out or close it.</p>
        <p role="status" className={styles.error}>{status}</p>
        <button className={styles.primary} disabled={busy || pinInput.length !== 4 || !tokenInput.trim()}>{busy ? "Checking access…" : "Open admin studio"}</button>
      </form>
    </div> : <>
      <div className={online.setting}>
        <div><h2>Keep the surprise safe.</h2><p>Reveal the companion only when you are ready. When hidden, its artwork, links and controls disappear from the visitor site.</p><small>Changes publish automatically. Allow about a minute for deployment.</small></div>
        <button type="button" role="switch" aria-checked={companionEnabled} aria-label="Show companion on visitor site" disabled={busy} onClick={() => { void toggleCompanion(); }}>{companionEnabled ? "On — visible" : "Off — hidden"}</button>
      </div>
      <div className={styles.toolbar}><p>Only your GitHub account can publish this album.</p><div className={styles.actions}>
        <button disabled={busy} onClick={() => { void publish([...memories, { id: crypto.randomUUID(), photo: "", caption: "", story: "" }], "Memory added."); }}>Add a memory</button>
        <button disabled={busy || !dirty} onClick={() => { void publish(memories, "Writing saved."); }}>Save writing</button>
        <button disabled={busy} onClick={() => { void signOut(); }}>Save & sign out</button>
      </div></div>
      <p className={styles.storage}>Photo and deletion changes publish when completed. Save writing after editing captions or stories.</p>
      <p className={styles.status} role="status">{status}</p>
      {!memories.length && <div className={styles.empty}><p>Start with a moment you never want to forget.</p><button className={styles.primary} disabled={busy} onClick={() => { void publish([{ id: crypto.randomUUID(), photo: "", caption: "", story: "" }], "Memory added."); }}>Add our first memory</button></div>}
      <div className={styles.grid}>{memories.map((memory, index) => <article className={styles.polaroid} key={memory.id}>
        <label className={styles.photo}>{memory.photo ? <img src={memory.photo} alt={memory.caption || `Memory ${index + 1}`} /> : <span className={styles.placeholder}><span aria-hidden="true">＋</span><span>Add our photo</span></span>}
          <input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label={`${memory.photo ? "Replace" : "Add"} photo ${index + 1}`} onChange={event => { void upload(memory.id, event.target.files?.[0]); event.target.value = ""; }} />
          {memory.photo && <span className={styles.replace}>Change photo</span>}
        </label>
        <label className={styles.caption}><span className={styles.srOnly}>Caption for memory {index + 1}</span><textarea disabled={busy} rows={2} maxLength={140} placeholder="A few words about us…" value={memory.caption} onChange={event => update(memory.id, { caption: event.target.value })} /></label>
        <label className={online.storyLabel}>The story behind this photo<textarea disabled={busy} rows={5} maxLength={5000} placeholder="I remember the way I felt when…" value={memory.story} onChange={event => update(memory.id, { story: event.target.value })} /></label>
        <div className={styles.cardActions}>{memory.photo && <button disabled={busy} onClick={() => setDeleting({ id: memory.id, kind: "photo" })}>Delete photo</button>}<button disabled={busy} onClick={() => setDeleting({ id: memory.id, kind: "memory" })}>Delete memory</button></div>
      </article>)}</div>
    </>}
    <dialog ref={confirmation} className={`${styles.dialog} ${styles.confirmation}`} onCancel={() => setDeleting(null)} onClose={() => setDeleting(null)} aria-labelledby="delete-heading">
      <h2 id="delete-heading">{deleting?.kind === "photo" ? "Delete this photo?" : "Delete this memory?"}</h2>
      <p>{deleting?.kind === "photo" ? "The caption and story will stay in your studio." : "The photo, caption and story will be removed from the album."}</p>
      <p role="status">{status}</p><div className={styles.actions}><button disabled={busy} onClick={() => confirmation.current?.close()}>Keep it</button><button className={styles.primary} disabled={busy} onClick={() => { void deleteItem(); }}>{busy ? "Publishing…" : "Delete and publish"}</button></div>
    </dialog>
  </section>;
}
