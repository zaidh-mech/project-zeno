import { createCipheriv, pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { readAlbum, readPhoto } from "./gallery-store";

export async function exportGallery() {
  const pin = process.env.AURA_GALLERY_PIN;
  if (!pin || !/^\d{4}$/.test(pin)) throw new Error("Set a four-digit gallery PIN before exporting.");
  const album = (await readAlbum()).filter(memory => memory.photo);
  const memories = await Promise.all(album.map(async memory => ({
    id: memory.id, caption: memory.caption, story: memory.story,
    photo: `data:${memory.mime};base64,${(await readPhoto(memory.photo)).toString("base64")}`,
  })));
  const salt = randomBytes(16), iv = randomBytes(12);
  const iterations = 250_000;
  const key = pbkdf2Sync(pin, salt, iterations, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(memories), "utf8"), cipher.final(), cipher.getAuthTag()]);
  const payload = JSON.stringify({ version: 1, iterations, salt: salt.toString("base64"), iv: iv.toString("base64"), data: encrypted.toString("base64") });
  if (Buffer.byteLength(payload) > 90 * 1024 * 1024) throw new Error("This export is too large for GitHub. Use smaller photos or fewer memories.");
  const exportPath = process.env.AURA_GALLERY_EXPORT_PATH || path.join(process.cwd(), "public", "gallery.enc.json");
  const publicDir = path.dirname(exportPath);
  await mkdir(publicDir, { recursive: true });
  const temporary = path.join(publicDir, `.gallery-${randomUUID()}.tmp`);
  await writeFile(temporary, payload);
  await rename(temporary, exportPath);
  return memories.length;
}
