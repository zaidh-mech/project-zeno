# Memory gallery and online admin

The birthday site and admin studio are both published on GitHub Pages:

- Viewer: `https://zaidh-mech.github.io/project-zeno/` — answer any five different configured nicknames to read the album. There are no editing controls.
- Admin: `https://zaidh-mech.github.io/project-zeno/admin/` — sign in with a GitHub credential and at least five accepted nicknames. Add, replace or delete photos; edit captions and stories.

GitHub Pages serves static files, so the `/admin/` URL itself can be opened by anyone. Editing is restricted by GitHub: the page requires a token for the `zaidh-mech` account with write access to `project-zeno`. The token stays in that browser tab's memory and is not saved in the site, local storage, or the album file. A visitor cannot publish by knowing the album answers or opening the admin URL.

## Create the admin credential

While signed in to GitHub as **zaidh-mech**, create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new):

1. Select the `project-zeno` repository only.
2. Grant repository **Contents: Read and write**. Leave all other optional permissions unset.
3. Choose an expiration date, copy the token, and keep it private.
4. Open `/project-zeno/admin/` and enter that token and at least five saved nicknames, one per line. For an existing PIN album, open the first-time setup section and enter the old PIN instead.

GitHub validates the credential on every save. The editor never stores it persistently. A lost or expired token can be replaced in GitHub settings. The older `AURA_GALLERY_ADMIN_PASSWORD` is for the local Next.js studio only; it cannot authenticate to GitHub Pages.

## Set the nickname answers

On the first visit after the upgrade, open **First-time setup: my album still uses a PIN**, enter the existing album PIN, and sign in with the GitHub token. In **The names only we know**, enter 5 to 50 distinct names, one per line, and choose **Save names**. Commas and semicolons also separate admin entries. The existing photos and writing are re-encrypted and preserved. The visitor form stays locked with a setup message until names are configured; no default answers are supplied.

The visitor enters five names in five fields, in any order. NFKC Unicode normalization, lowercase matching, and collapsed whitespace make capitalization and extra spaces irrelevant. Duplicates count once. The editor can change the accepted list with **Save names**; changing the list re-encrypts the album. An open viewer locks on its next refresh if its previous answers no longer open the album.

Version 2 uses a fresh random AES-GCM album key split into five-required shares over GF(256). Each accepted name protects one share with PBKDF2-SHA-256 and AES-GCM. Five valid shares reconstruct the key. The full accepted name list is inside the encrypted album, so an authenticated admin who knows five can recover and edit all names. The public payload contains salted name identifiers and encrypted shares, with no plaintext names, captions or photos. Predictable names can still be guessed offline; this is a personal surprise gate, not strong authentication. GitHub credentials enforce editing rights separately.

## Edit and publish

In the online admin studio, choose **Add a memory**. Upload a JPG, PNG, WebP or GIF photo smaller than 8 MB. Add a caption and story, then choose **Save writing**. Photo uploads, replacements, deletions, and saved writing immediately create an encrypted album commit in the repository. That commit starts the existing GitHub Pages workflow. The visitor site normally updates after the workflow finishes, around a minute later; open viewers check for updates every minute and when they return to the tab. Check [the publishing workflow](https://github.com/zaidh-mech/project-zeno/actions/workflows/pages.yml) if an update is delayed.

**Delete photo** removes the image from the visitor album but keeps the caption and story in the admin studio. **Delete memory** removes the whole card. Confirm each deletion in the dialog. GitHub history can retain earlier encrypted versions after a deletion.

The online studio edits `web/public/gallery.enc.json` directly using GitHub's repository contents API. It checks the file version before each update, so a conflicting change asks the admin to reload instead of overwriting someone else's work. GitHub's workflow builds the viewer and admin pages from the new commit.

## Local studio

The previous local admin is still available through `npm run dev` at `http://localhost:3000/admin`. It uses `AURA_GALLERY_ADMIN_PASSWORD` and stores originals in ignored `web/.gallery-data/`. Local changes are separate from online edits until you choose **Export for GitHub Pages** and commit/push `web/public/gallery.enc.json`. Do not use local export over newer online edits without checking first.

The local studio still exports the legacy version 1 PIN format. Do not export it over a configured version 2 nickname album; that would replace nickname unlocking. Use the online admin to maintain the deployed nickname album.

## Checks

From `web`, run `npm run typecheck`, `npm run build:pages`, `node scripts/check-pages.cjs`, and `node scripts/check-online-gallery.cjs`, and `node scripts/check-nickname-gallery.cjs`. The checks cover the static output, encryption, GitHub owner and write permission checks, and versioned publishing. `node scripts/check-gallery.cjs` checks the local server gallery after `npm run build`.
