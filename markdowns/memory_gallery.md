# Gallery admin and GitHub Pages

The birthday page is a read-only Polaroid album. Visitors enter the four-digit gallery PIN, open photos, and read captions and stories. They cannot add, change or delete anything.

## Edit on your computer

1. Run `npm run dev` in `web` and open `http://localhost:3000/admin`.
2. Sign in using `AURA_GALLERY_ADMIN_PASSWORD` from `web/.env.local` (a separate password, at least 12 characters).
3. Choose **Add a memory**, upload a photo, and write its caption and story. Choose **Save writing** to save text. Photos save immediately to the local album.
4. **Delete photo** removes the image while keeping its caption and story. **Delete memory** removes the whole card. Each action asks you to confirm.
5. Choose **Export for GitHub Pages**. This saves your writing and writes the encrypted viewer album to `web/public/gallery.enc.json`. Only memories with photos are included.

The local server stores originals and text in `web/.gallery-data/`, which is ignored by Git. Back up that folder and `.env.local` privately. These replace the old browser-only drafts; older IndexedDB drafts remain in their original browser storage.

## Publish on GitHub Pages

[GitHub Pages is a static hosting service](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). It cannot receive photo uploads or run the local admin server. The admin studio stays on your computer. Publishing exports a separate read-only site without `/admin` or `/api` routes.

1. Export the album from the local admin page.
2. Commit the code and `web/public/gallery.enc.json` and push to GitHub. Never commit `.env.local` or `.gallery-data`.
3. In the repository’s **Settings → Pages**, set the source to **GitHub Actions**.
4. The included `.github/workflows/pages.yml` builds and deploys on pushes to `main` or `master`, or can be run manually in Actions.
5. Repeat export, commit and push whenever you want to publish additions, edits or deletions. Local changes alone do not change the live website.

Run `npm run build:pages` to verify the static site locally. Output is `web/out/`. The build uses the GitHub repository path, defaulting to `/project-zeno`. Set `PAGES_BASE_PATH` to an empty string for a custom domain or to another `/repository-name` as needed. The Actions workflow obtains the base path from GitHub Pages configuration.

The encrypted export is limited to 90 MB. Individual photos support JPG, PNG, WebP and GIF up to 8 MB. Smaller photos keep the album fast on phones, because the complete encrypted album downloads when opened.

## Passcodes and privacy

- `AURA_GALLERY_PIN`: four digits; used by viewers. Export again after changing it.
- `AURA_GALLERY_ADMIN_PASSWORD`: separate password of at least 12 characters, used only by the local studio.
- `AURA_GALLERY_SESSION_SECRET`: random string of at least 32 characters, used to sign local server sessions.
- `AURA_GALLERY_DATA_DIR`: optional persistent directory for the local album; defaults to `.gallery-data`.

The local server enforces admin permissions for every write, uses HTTP-only signed sessions, checks request origin, and requires a session to read originals. The static site includes neither admin credentials nor raw original files. Its exported photos and writing are encrypted with AES-256-GCM using a PBKDF2-derived PIN key (250,000 SHA-256 iterations). A four-digit PIN has only 10,000 possibilities and can be guessed offline; this is a casual privacy gate, not strong protection for sensitive photos. GitHub history can retain previous encrypted exports after a photo is deleted from the live site.

## Verification

Run `npm run build`, then `node scripts/check-gallery.cjs`. The checks use an isolated temporary album and test admin edits, viewer write denial, protected photos, session tampering, origin validation, cross-device viewing, deletion, encrypted export with browser-compatible decryption, and failed-login limits. Use the same `AURA_NEXT_DIST_DIR` for both commands if building alongside a running dev server.
