export type GalleryMemory = { id: string; photo: string; caption: string; story: string };
export const isStaticGallery = process.env.NEXT_PUBLIC_GALLERY_STATIC === "true";

export async function readPublishedGallery(pin: string): Promise<GalleryMemory[]> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const response = await fetch(`${base}/gallery.enc.json`, { cache: "no-store" });
  if (!response.ok) throw new Error("The album hasn’t been published yet. Please come back soon.");
  const payload = await response.json();
  if (payload.version !== 1 || payload.iterations !== 250_000) throw new Error("This album could not be opened. Please refresh the page.");
  const bytes = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(payload.salt), iterations: payload.iterations, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(payload.iv) }, key, bytes(payload.data));
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch { throw new Error("That PIN doesn’t match. Try again."); }
}
