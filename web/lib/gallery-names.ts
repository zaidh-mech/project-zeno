import type { GalleryMemory } from "./gallery-reader";

const encode = (value: Uint8Array) => {
  let result = "";
  for (let i = 0; i < value.length; i += 16384) result += String.fromCharCode(...value.subarray(i, i + 16384));
  return btoa(result);
};
const decode = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const normalize = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
export function nicknameList(text: string) { return [...new Set(text.split(/[\n,;]+/).map(normalize).filter(Boolean))]; }

// Five independent name-protected shares reconstruct the random album key.
function multiply(a: number, b: number) {
  let result = 0;
  while (b) { if (b & 1) result ^= a; a = (a << 1) ^ ((a & 128) ? 0x11b : 0); b >>= 1; }
  return result;
}
function inverse(value: number) {
  if (!value) throw new Error("Invalid name shares.");
  let result = 1;
  for (let i = 0; i < 254; i++) result = multiply(result, value);
  return result;
}
async function nameKey(name: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(name), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function nameId(name: string, salt: string) {
  return encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${name}`))));
}
type Share = { id: string; x: number; iv: string; data: string };
type Payload = { version: 2; iterations: number; salt: string; iv: string; data: string; shares: Share[] };

export async function encryptNicknameGallery(memories: GalleryMemory[], input: string[]): Promise<string> {
  const names = [...new Set(input.map(normalize).filter(Boolean))];
  if (names.length < 5 || names.length > 50) throw new Error("Enter between 5 and 50 different cute names, one per line.");
  if (names.some(name => name.length > 100)) throw new Error("Keep each cute name under 100 characters.");
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const coefficients = crypto.getRandomValues(new Uint8Array(32 * 4));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltText = encode(salt);
  const shares: Share[] = [];
  for (let i = 0; i < names.length; i++) {
    const x = i + 1;
    const share = secret.map((value, byte) => {
      let power = 1;
      for (let degree = 0; degree < 4; degree++) { power = multiply(power, x); value ^= multiply(coefficients[byte * 4 + degree], power); }
      return value;
    });
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await nameKey(names[i], salt);
    shares.push({ x, id: await nameId(names[i], saltText), iv: encode(iv), data: encode(new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, share))) });
  }
  const key = await crypto.subtle.importKey("raw", secret, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify({ memories, names })));
  const result = JSON.stringify({ version: 2, iterations: 250000, salt: saltText, iv: encode(iv), data: encode(new Uint8Array(data)), shares });
  if (result.length > 75 * 1024 * 1024) throw new Error("The album is too large to publish. Use smaller photos.");
  return result;
}

export async function decryptNicknameGallery(input: unknown, answers: string[]): Promise<{ memories: GalleryMemory[]; names: string[] }> {
  const payload = input as Payload;
  if (!payload || payload.version !== 2) throw new Error("Our nickname surprise is being prepared. Come back once the names are set up.");
  if (payload.iterations !== 250000 || typeof payload.salt !== "string" || typeof payload.iv !== "string" || typeof payload.data !== "string" || !Array.isArray(payload.shares) || payload.shares.length < 5 || payload.shares.length > 50 || !payload.shares.every(share => Number.isInteger(share.x) && share.x > 0 && share.x < 256 && typeof share.id === "string" && typeof share.iv === "string" && typeof share.data === "string") || new Set(payload.shares.map(share => share.x)).size !== payload.shares.length) throw new Error("This album could not be read. Refresh and try again.");
  const names = [...new Set(answers.map(normalize).filter(Boolean))];
  if (names.length < 5) throw new Error("Tell me five different names I call you.");
  const parts: { x: number; value: Uint8Array }[] = [];
  for (const name of names.slice(0, 50)) {
    // Match salted identifiers; the public file never lists the plaintext answers.
    const id = await nameId(name, payload.salt);
    const share = payload.shares.find(item => item.id === id);
    if (!share) continue;
    try {
      const key = await nameKey(name, decode(payload.salt));
      const value = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(share.iv) }, key, decode(share.data)));
      if (value.length === 32) parts.push({ x: share.x, value });
    } catch { /* A damaged or incorrect share never contributes to unlocking. */ }
    if (parts.length === 5) break;
  }
  if (parts.length !== 5) throw new Error("Not quite, my love. Try five different names I love to call you.");
  const secret = new Uint8Array(32);
  for (let i = 0; i < parts.length; i++) {
    let weight = 1;
    for (let j = 0; j < parts.length; j++) if (j !== i) weight = multiply(weight, multiply(parts[j].x, inverse(parts[i].x ^ parts[j].x)));
    for (let byte = 0; byte < 32; byte++) secret[byte] ^= multiply(parts[i].value[byte], weight);
  }
  try {
    const key = await crypto.subtle.importKey("raw", secret, "AES-GCM", false, ["decrypt"]);
    const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(payload.iv) }, key, decode(payload.data));
    const album = JSON.parse(new TextDecoder().decode(data));
    if (!Array.isArray(album.memories) || !album.memories.every((memory: GalleryMemory) => memory && typeof memory.id === "string" && typeof memory.photo === "string" && typeof memory.caption === "string" && typeof memory.story === "string") || !Array.isArray(album.names) || !album.names.every((name: unknown) => typeof name === "string")) throw new Error("Invalid album");
    return album;
  } catch { throw new Error("This album could not be opened. Refresh and try again."); }
}
