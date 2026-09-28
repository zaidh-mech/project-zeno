"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import styles from "./MemoryGallery.module.css";
import { isStaticGallery, readPublishedGallery } from "@/lib/gallery-reader";

type Memory = { id: string; photo: string; caption: string; story: string };
const prompts = ["Where our story began", "A day I wish we could replay", "The little things about us", "Somewhere, with you", "A moment that felt like home", "Another memory to keep"];

async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}

export default function MemoryGallery({ admin = false }: { admin?: boolean }) {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: "photo" | "memory" } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmation = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const passcodeInput = useRef<HTMLInputElement>(null);
  const current = memories.find(memory => memory.id === activeId);
  const active = memories.findIndex(memory => memory.id === activeId);

  useEffect(() => { if (activeId) dialog.current?.showModal(); }, [activeId]);
  useEffect(() => { if (deleteTarget) confirmation.current?.showModal(); }, [deleteTarget]);
  useEffect(() => { if (unlocked) heading.current?.focus(); }, [unlocked]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function unlock(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (isStaticGallery) {
        setMemories(await readPublishedGallery(passcode)); setStatus(""); setPasscode(""); setUnlocked(true); return;
      }
      await api("/api/gallery/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(admin ? { role: "admin", password: passcode } : { pin: passcode }) });
      const result = await api("/api/gallery");
      if (admin && result.role !== "admin") throw new Error("Sign in with the admin password.");
      setMemories(result.memories); setStatus(""); setPasscode(""); setUnlocked(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t open the gallery."); setPasscode(""); passcodeInput.current?.focus(); }
    finally { setBusy(false); }
  }

  function update(id: string, patch: Partial<Memory>) {
    if (!admin || busy) return;
    setMemories(previous => previous.map(memory => memory.id === id ? { ...memory, ...patch } : memory));
    setDirty(true); setStatus("You have unsaved writing.");
  }

  async function saveWriting() {
    for (const memory of memories) {
      await api(`/api/gallery/memory/${memory.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption: memory.caption, story: memory.story }) });
    }
    setDirty(false);
  }

  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setStatus("");
    try { await work(); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Couldn’t save. Try again."); }
    finally { setBusy(false); }
  }

  async function addMemory() {
    await action(async () => {
      const { memory } = await api("/api/gallery", { method: "POST" });
      setMemories(previous => [...previous, memory]); setStatus("Memory added. Choose a photo to share it.");
    });
  }

  async function addPhoto(id: string, file?: File) {
    if (!file || !admin) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 8 * 1024 * 1024) { setStatus("Choose a JPG, PNG, WebP or GIF smaller than 8 MB."); return; }
    await action(async () => {
      const data = new FormData(); data.append("photo", file);
      const { memory } = await api(`/api/gallery/photo/${id}`, { method: "POST", body: data });
      setMemories(previous => previous.map(item => item.id === id ? { ...item, photo: memory.photo } : item));
      setStatus("Photo saved locally. Export the album when you’re ready to publish.");
    });
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    await action(async () => {
      await api(`/api/gallery/${deleteTarget.kind}/${deleteTarget.id}`, { method: "DELETE" });
      setMemories(previous => deleteTarget.kind === "memory" ? previous.filter(item => item.id !== deleteTarget.id) : previous.map(item => item.id === deleteTarget.id ? { ...item, photo: "" } : item));
      confirmation.current?.close();
      setStatus(deleteTarget.kind === "photo" ? "Photo deleted. Your caption and story are kept." : "Memory deleted.");
    });
  }

  async function lock() {
    await action(async () => {
      if (admin && dirty) await saveWriting();
      if (!isStaticGallery) await api("/api/gallery/unlock", { method: "DELETE" });
      dialog.current?.close(); setUnlocked(false); setMemories([]); setActiveId(null); setError("");
      requestAnimationFrame(() => passcodeInput.current?.focus());
    });
  }

  return <section className={styles.gallery} aria-labelledby="gallery-heading">
    <div className={styles.heading}>
      <span className={styles.thread} aria-hidden="true">♡</span>
      <h2 id="gallery-heading" tabIndex={-1} ref={heading}>{admin ? "Keep our memories here." : "A little collection of us."}</h2>
      <p>{admin ? "Choose the photos. Write the feelings. Tell our story." : "Every photo, a feeling. Every feeling, a story worth keeping."}</p>
    </div>
    {!unlocked ? <div className={styles.locked}>
      <div className={styles.stack} aria-hidden="true"><span /><span /><span>just us ♡</span></div>
      <form onSubmit={unlock} className={styles.pinForm}>
        <h3>{admin ? "Your album studio." : "Our memories live here."}</h3>
        <label htmlFor="gallery-passcode">{admin ? "Sign in with your private admin password" : "Enter our four-digit PIN to open the album"}</label>
        <input ref={passcodeInput} className={admin ? styles.adminPassword : undefined} id="gallery-passcode" type="password" inputMode={admin ? "text" : "numeric"} autoComplete={admin ? "current-password" : "off"} pattern={admin ? undefined : "[0-9]{4}"} maxLength={admin ? 200 : 4} minLength={admin ? 12 : 4} required value={passcode} onChange={e => setPasscode(admin ? e.target.value : e.target.value.replace(/\D/g, ""))} aria-describedby="pin-error" placeholder={admin ? "Admin password" : "••••"} />
        <p id="pin-error" role="alert" className={styles.error}>{error}</p>
        <button className={styles.primary} disabled={busy || (admin ? passcode.length < 12 : passcode.length !== 4)}>{busy ? "Opening…" : admin ? "Sign in to edit" : "Open our album"}</button>
      </form>
    </div> : <>
      <div className={styles.toolbar}><p>{admin ? "Add a photo. Leave a little love underneath." : "Take your time. There’s a story in every photo."}</p><div className={styles.actions}>
        {admin && <><button disabled={busy} onClick={addMemory}>Add a memory</button><button disabled={busy || !dirty} onClick={() => action(async () => { await saveWriting(); setStatus("Writing saved locally."); })}>Save writing</button><button disabled={busy} onClick={() => action(async () => { if (dirty) await saveWriting(); const result = await api("/api/gallery/export", { method: "POST" }); setStatus(`Exported ${result.count} memories to web/public/gallery.enc.json. Commit and push that file to publish your changes.`); })}>Export for GitHub Pages</button></>}
        <button disabled={busy} onClick={lock}>{admin ? "Save & sign out" : "Lock album"}</button>
      </div></div>
      {admin && <p className={styles.storage}>Your private editing studio. Save your writing, then export the album to update the published site.</p>}
      <p className={styles.status} role="status">{busy ? "Please wait…" : status}</p>
      {!memories.length && <div className={styles.empty}><p>{admin ? "Start with a moment you never want to forget." : "Our album is waiting for its first memory."}</p>{admin && <button className={styles.primary} disabled={busy} onClick={addMemory}>Add our first memory</button>}</div>}
      <div className={styles.grid}>{memories.map((memory, index) => <article className={styles.polaroid} key={memory.id}>
        {admin ? <label className={styles.photo}>
          {memory.photo ? <img src={memory.photo} alt={memory.caption || `Our memory ${index + 1}`} /> : <span className={styles.placeholder}><span aria-hidden="true">＋</span><span>Add our photo</span><small>{prompts[index % prompts.length]}</small></span>}
          <input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label={`${memory.photo ? "Replace" : "Add"} photo ${index + 1}`} onChange={e => { void addPhoto(memory.id, e.target.files?.[0]); e.target.value = ""; }} />
          {memory.photo && <span className={styles.replace}>Change photo</span>}
        </label> : <button className={`${styles.photo} ${styles.viewPhoto}`} onClick={() => setActiveId(memory.id)} aria-label={`Open story: ${memory.caption || `memory ${index + 1}`}`}><img src={memory.photo} alt={memory.caption || `Our memory ${index + 1}`} loading="lazy" /></button>}
        {admin ? <label className={styles.caption}><span className={styles.srOnly}>Caption for memory {index + 1}</span><textarea disabled={busy} rows={2} maxLength={140} placeholder="A few words about us…" value={memory.caption} onChange={e => update(memory.id, { caption: e.target.value })} /></label> : <p className={styles.readCaption}>{memory.caption || "A moment with you."}</p>}
        <button className={styles.storyButton} onClick={() => setActiveId(memory.id)}>{admin ? "Edit our story" : "Read our story"}<span aria-hidden="true">♡</span></button>
        {admin && <div className={styles.cardActions}>{memory.photo && <button disabled={busy} onClick={() => setDeleteTarget({ id: memory.id, kind: "photo" })}>Delete photo</button>}<button disabled={busy} onClick={() => setDeleteTarget({ id: memory.id, kind: "memory" })}>Delete memory</button></div>}
      </article>)}</div>
      <p className={styles.closing}>The best part? We’re still making memories.</p>
    </>}
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setActiveId(null)} onClose={() => setActiveId(null)} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }} aria-labelledby="memory-title">
      {current && <div className={styles.storyLayout}>
        <div className={styles.storyPhoto}>{current.photo ? <img src={current.photo} alt={current.caption || "A photo of our memory"} /> : <div className={styles.storyEmpty}>A photo will go here.<span>There’s already a story to tell.</span></div>}<p>{current.caption || "A moment with you"}</p></div>
        <div className={styles.storyCopy}>
          <button className={styles.close} onClick={() => dialog.current?.close()} aria-label="Close story">×</button>
          <h3 id="memory-title">The story behind us.</h3>
          {admin ? <><p>Where were we? What made you smile? What do you want us to remember?</p>
            <label htmlFor="memory-story">What this moment means to me</label>
            <textarea disabled={busy} id="memory-story" rows={8} maxLength={5000} value={current.story} placeholder="I remember the way I felt when…" onChange={e => update(current.id, { story: e.target.value })} />
            <button className={styles.primary} disabled={busy || !dirty} onClick={() => action(async () => { await saveWriting(); setStatus("Writing saved locally."); })}>Save writing</button>
            <p role="status" className={styles.dialogStatus}>{busy ? "Saving…" : status}</p></> : <p className={styles.readStory}>{current.story || "Sometimes a photo holds more than words can say."}</p>}
          <nav className={styles.storyNav} aria-label="Browse memories"><button disabled={active === 0} onClick={() => setActiveId(memories[active - 1].id)}>Previous</button><span>{active + 1} / {memories.length}</span><button disabled={active === memories.length - 1} onClick={() => setActiveId(memories[active + 1].id)}>Next memory</button></nav>
        </div>
      </div>}
    </dialog>
    <dialog ref={confirmation} className={`${styles.dialog} ${styles.confirmation}`} onCancel={() => setDeleteTarget(null)} onClose={() => setDeleteTarget(null)} aria-labelledby="delete-title">
      <h3 id="delete-title">{deleteTarget?.kind === "photo" ? "Delete this photo?" : "Delete this memory?"}</h3>
      <p>{deleteTarget?.kind === "photo" ? "The caption and story will stay in your studio. Export and republish to remove the photo from the live site." : "The photo, caption and story will be removed locally. Export and republish to update the live site."}</p>
      <p role="status">{status}</p><div className={styles.actions}><button disabled={busy} onClick={() => confirmation.current?.close()}>Keep it</button><button className={styles.primary} disabled={busy} onClick={deleteItem}>{busy ? "Deleting…" : "Delete"}</button></div>
    </dialog>
  </section>;
}
