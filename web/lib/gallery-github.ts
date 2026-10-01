import { decryptGallery, encryptGallery, type GalleryMemory } from "./gallery-reader";

const repository = process.env.NEXT_PUBLIC_GITHUB_REPOSITORY || "zaidh-mech/project-zeno";
const owner = repository.split("/")[0];
const filePath = "web/public/gallery.enc.json";
const apiBase = `https://api.github.com/repos/${repository}`;

function headers(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function request(url: string, token: string, options?: RequestInit) {
  let response: Response;
  try { response = await fetch(url, { cache: "no-store", ...options, headers: { ...headers(token), ...options?.headers } }); }
  catch { throw new Error("Couldn’t reach GitHub. Check your connection and try again."); }
  if (response.status === 401) throw new Error("GitHub rejected this token. Sign in with a valid token.");
  if (response.status === 403) throw new Error("This GitHub token needs Contents read and write access to this repository.");
  if (response.status === 409 || response.status === 422) throw new Error("The album changed on GitHub. Reload the admin page before saving again.");
  if (!response.ok) throw new Error(`GitHub could not save the album (HTTP ${response.status}).`);
  return response.json();
}

export async function openGithubAlbum(token: string, pin: string): Promise<{ memories: GalleryMemory[]; sha: string }> {
  const person = await request("https://api.github.com/user", token);
  if (typeof person.login !== "string" || person.login.toLowerCase() !== owner.toLowerCase()) throw new Error("Only the repository owner can open this admin studio.");
  const repo = await request(apiBase, token);
  if (!repo.permissions?.push) throw new Error("This token needs Contents read and write access to this repository.");
  const url = `${apiBase}/contents/${filePath}?ref=main`;
  const file = await request(url, token);
  if (typeof file.sha !== "string") throw new Error("The published album file could not be read.");
  // GitHub omits the inline content for files larger than 1 MB; request its raw media type then.
  const payload = file.encoding === "base64" && typeof file.content === "string" && file.content
    ? JSON.parse(atob(file.content.replace(/\s/g, "")))
    : await request(url, token, { headers: { Accept: "application/vnd.github.raw+json" } });
  return { memories: await decryptGallery(payload, pin), sha: file.sha };
}

export async function publishGithubAlbum(token: string, pin: string, sha: string, memories: GalleryMemory[]): Promise<string> {
  const payload = await encryptGallery(memories, pin);
  const result = await request(`${apiBase}/contents/${filePath}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Publish Aura memory album", content: btoa(payload), sha, branch: "main" }),
  });
  if (typeof result.content?.sha !== "string") throw new Error("GitHub saved the album but did not return its new version. Reload before editing again.");
  return result.content.sha;
}

export async function readGithubSettings(token: string): Promise<{ enabled: boolean; sha: string }> {
  const file = await request(`${apiBase}/contents/web/public/site-settings.json?ref=main`, token);
  const settings = JSON.parse(atob(file.content.replace(/\s/g, "")));
  if (typeof file.sha !== "string" || typeof settings.companionEnabled !== "boolean") throw new Error("Site settings could not be read. Reload before changing them.");
  return { enabled: settings.companionEnabled, sha: file.sha };
}

export async function publishGithubSettings(token: string, sha: string, enabled: boolean): Promise<string> {
  const result = await request(`${apiBase}/contents/web/public/site-settings.json`, token, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Update visitor site settings", content: btoa(JSON.stringify({ companionEnabled: enabled })), sha, branch: "main" }),
  });
  if (typeof result.content?.sha !== "string") throw new Error("Reload the admin page to check the saved setting.");
  return result.content.sha;
}
