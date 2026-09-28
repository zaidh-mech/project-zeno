# Aura birthday portal

The NFC companion is a mobile-first Next.js app in [`web/`](../web/). Its front page shows a floating 3D Aura with a heart, quiet stars, a tap-to-connect pet, and a full-screen deck of letters. Each letter scrolls independently, with previous/next buttons, page dots, arrow keys, and horizontal swipes for navigation. A CSS companion replaces the 3D scene when WebGL is unavailable or reduced motion is requested. The pet pairs over Web Bluetooth using the same Aura service as [`/control`](../web/app/control/page.tsx) and sends a smile command when tapped again. Voice and Wi-Fi setup remain on `/control`; see [phone control setup](phone_control.md).

## Run it

Requirements: Node.js 20.9 or newer.

```powershell
cd web
Copy-Item .env.example .env.local
npm install
npm run dev
```

PowerShell installations that block `npm.ps1` can use `npm.cmd` in each command. Open `http://localhost:3000`.

Edit `.env.local` before building:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_AURA_RECIPIENT` | Name used in the header and letter |
| `NEXT_PUBLIC_AURA_PET_NAME` | Affectionate name in the birthday greeting |
| `NEXT_PUBLIC_AURA_SENDER` | Signature |
| `NEXT_PUBLIC_AURA_LETTER` | Letter body; write `\n` between paragraphs |
| `NEXT_PUBLIC_AURA_LETTERS` | Optional JSON array of `{ "title": "...", "body": "..." }`; replaces the default three-letter deck. Bodies can be any length. |

These `NEXT_PUBLIC_` variables are embedded into the browser bundle at build time. The sample content is generic until personalized. Do not put secrets in them. GitHub Pages now publishes both the read-only viewer and an online admin studio at `/admin/`; see [gallery access and publishing instructions](memory_gallery.md). The local studio still uses `AURA_GALLERY_PIN`, `AURA_GALLERY_ADMIN_PASSWORD`, and `AURA_GALLERY_SESSION_SECRET` in `.env.local`.

## Program the NFC sticker

1. Deploy and open the public HTTPS address on a phone. Confirm the letter opens there.
2. Use an NFC writing app and choose a **URL / URI** record, which writes an NDEF URI record to the NTAG213 sticker.
3. Enter the exact deployed address, including `https://` and the trailing path if the portal is not at the site root.
4. Write, then read the tag back and tap it with a second phone to verify it opens the right page. Lock the sticker only after final verification, since locking is permanent.

The letter is static and needs no backend. Voice use on `/control` does need the separate AI backend and the C3's Wi-Fi connection. The NFC sticker contains only the URL, so the letter is public to anyone who knows the address. Use a long, unguessable URL if the letter should be less discoverable, or add authenticated hosting if it must be private.

## Component structure

- `web/app/page.tsx`: interaction, WebGL detection, full-screen letter deck, focus handling.
- `web/components/AuraScene.tsx`: React Three Fiber companion and heart.
- `web/components/CompanionPet.tsx`: tap-to-connect Web Bluetooth pet and smile interaction.
- `web/app/globals.css`: Tailwind entry and the custom visual system.
- `web/lib/content.ts`: build-time content configuration.

The app uses Next.js App Router, React 19, Tailwind CSS 4, Three.js with React Three Fiber 9, and Motion for React (the current Framer Motion package). Local development includes a server-backed admin studio. `npm run build:pages` creates a static viewer and admin site without local API routes. The online studio authenticates writes through GitHub and publishes the encrypted album by committing it to the repository.
