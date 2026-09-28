import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

export type StoredMemory = { id: string; caption: string; story: string; photo: string; mime: string };
const directory = path.resolve(process.env.AURA_GALLERY_DATA_DIR || path.join(process.cwd(), ".gallery-data"));
const albumPath = path.join(directory, "album.json");
const shared = globalThis as typeof globalThis & { auraGalleryQueues?: Map<string, Promise<unknown>> };
const queues = shared.auraGalleryQueues ||= new Map();

export async function readAlbum(): Promise<StoredMemory[]> {
  try { return JSON.parse(await readFile(albumPath, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

export function editAlbum<T>(edit: (album: StoredMemory[]) => Promise<T>): Promise<T> {
  const operation = (queues.get(directory) || Promise.resolve()).then(async () => {
    await mkdir(directory, { recursive: true });
    const album = await readAlbum();
    const result = await edit(album);
    const temporary = `${albumPath}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(album), { mode: 0o600 });
    await rename(temporary, albumPath);
    return result;
  });
  queues.set(directory, operation.catch(() => {}));
  return operation;
}

export function publicMemory(memory: StoredMemory) {
  return { id: memory.id, caption: memory.caption, story: memory.story, photo: memory.photo ? `/api/gallery/photo/${memory.id}?v=${memory.photo}` : "" };
}

export async function savePhoto(data: Uint8Array) {
  const filename = randomUUID();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), data, { mode: 0o600 });
  return filename;
}

export async function removePhoto(filename: string) {
  if (/^[a-f0-9-]{36}$/.test(filename)) await unlink(path.join(directory, filename)).catch(error => { if (error.code !== "ENOENT") throw error; });
}

export async function readPhoto(filename: string) {
  if (!/^[a-f0-9-]{36}$/.test(filename)) throw new Error("Invalid photo");
  return readFile(path.join(directory, filename));
}
