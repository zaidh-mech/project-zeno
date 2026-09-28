export type GalleryMemory = { id: string; photo: string; caption: string; story: string };
export const isStaticGallery = process.env.NEXT_PUBLIC_GALLERY_STATIC === "true";

const bytes = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));
const base64 = (value: Uint8Array) => {
  let encoded = "";
  for (let start = 0; start < value.length; start += 16_384) encoded += String.fromCharCode(...value.subarray(start, start + 16_384));
  return btoa(encoded);
};

export async function decryptGallery(payload: unknown, pin: string): Promise<GalleryMemory[]> {
  if (!payload || typeof payload !== "object" || !("version" in payload) || !("iterations" in payload) || !("salt" in payload) || !("iv" in payload) || !("data" in payload) ||
    payload.version !== 1 || payload.iterations !== 250_000 || typeof payload.salt !== "string" || typeof payload.iv !== "string" || typeof payload.data !== "string") {
    throw new Error("This album could not be opened. Please refresh the page.");
  }
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(payload.salt), iterations: payload.iterations, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(payload.iv) }, key, bytes(payload.data));
    const memories: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    if (!Array.isArray(memories) || !memories.every((memory) => memory && typeof memory.id === "string" && typeof memory.photo === "string" && typeof memory.caption === "string" && typeof memory.story === "string")) throw new Error("Invalid album");
    return memories;
  } catch { throw new Error("That PIN doesn’t match, or this album could not be read."); }
}

export async function encryptGallery(memories: GalleryMemory[], pin: string): Promise<string> {
  if (!/^\d{4}$/.test(pin)) throw new Error("Enter the four-digit gallery PIN.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250_000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(memories))));
  const result = JSON.stringify({ version: 1, iterations: 250_000, salt: base64(salt), iv: base64(iv), data: base64(data) });
  if (result.length > 75 * 1024 * 1024) throw new Error("The album is too large to publish. Use smaller photos.");
  return result;
}

export async function readPublishedGallery(pin: string): Promise<GalleryMemory[]> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const response = await fetch(`${base}/gallery.enc.json`, { cache: "no-store" });
  if (!response.ok) throw new Error("The album hasn’t been published yet. Please come back soon.");
  return (await decryptGallery(await response.json(), pin)).filter(memory => memory.photo);
}
