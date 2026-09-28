# Memory gallery and online admin

The birthday site and admin studio are both published on GitHub Pages:

- Viewer: `https://zaidh-mech.github.io/project-zeno/` — enter the four-digit PIN to read the album. There are no editing controls.
- Admin: `https://zaidh-mech.github.io/project-zeno/admin/` — sign in with a GitHub credential and the album PIN. Add, replace or delete photos; edit captions and stories.

GitHub Pages serves static files, so the `/admin/` URL itself can be opened by anyone. Editing is restricted by GitHub: the page requires a token for the `zaidh-mech` account with write access to `project-zeno`. The token stays in that browser tab's memory and is not saved in the site, local storage, or the album file. A visitor cannot publish by knowing the gallery PIN or opening the admin URL.

## Create the admin credential

While signed in to GitHub as **zaidh-mech**, create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new):

1. Select the `project-zeno` repository only.
2. Grant repository **Contents: Read and write**. Leave all other optional permissions unset.
3. Choose an expiration date, copy the token, and keep it private.
4. Open `/project-zeno/admin/` and enter that token and the four-digit gallery PIN.

GitHub validates the credential on every save. The editor never stores it persistently. A lost or expired token can be replaced in GitHub settings. The older `AURA_GALLERY_ADMIN_PASSWORD` is for the local Next.js studio only; it cannot authenticate to GitHub Pages.

## Edit and publish

In the online admin studio, choose **Add a memory**. Upload a JPG, PNG, WebP or GIF photo smaller than 8 MB. Add a caption and story, then choose **Save writing**. Photo uploads, replacements, deletions, and saved writing immediately create an encrypted album commit in the repository. That commit starts the existing GitHub Pages workflow. The visitor site normally updates after the workflow finishes, around a minute later; open viewers check for updates every minute and when they return to the tab. Check [the publishing workflow](https://github.com/zaidh-mech/project-zeno/actions/workflows/pages.yml) if an update is delayed.

**Delete photo** removes the image from the visitor album but keeps the caption and story in the admin studio. **Delete memory** removes the whole card. Confirm each deletion in the dialog. GitHub history can retain earlier encrypted versions after a deletion.

The online studio edits `web/public/gallery.enc.json` directly using GitHub's repository contents API. It checks the file version before each update, so a conflicting change asks the admin to reload instead of overwriting someone else's work. GitHub's workflow builds the viewer and admin pages from the new commit.

## Local studio

The previous local admin is still available through `npm run dev` at `http://localhost:3000/admin`. It uses `AURA_GALLERY_ADMIN_PASSWORD` and stores originals in ignored `web/.gallery-data/`. Local changes are separate from online edits until you choose **Export for GitHub Pages** and commit/push `web/public/gallery.enc.json`. Do not use local export over newer online edits without checking first.

The exported album is encrypted with AES-256-GCM and a key derived from the four-digit PIN using PBKDF2-SHA-256. A four-digit PIN can be guessed offline and provides only casual privacy for the published photos. The admin credential protects writing through GitHub, while the PIN opens the viewer album. Avoid sensitive photos if stronger confidentiality is required.

## Checks

From `web`, run `npm run typecheck`, `npm run build:pages`, `node scripts/check-pages.cjs`, and `node scripts/check-online-gallery.cjs`. The checks cover the static output, encryption, GitHub owner and write permission checks, and versioned publishing. `node scripts/check-gallery.cjs` checks the local server gallery after `npm run build`.
