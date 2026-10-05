# Concurrent agent entry point

Read this file and run `powershell -NoProfile -ExecutionPolicy Bypass -File tools/agents.ps1 context` at
the start of each new task. This is the startup context: do not recursively scan
the repository or reread every document. Open only the source and documentation
needed for the requested task. Verify relevant facts against current files.

## Project map

Aura is a birthday desk companion. The current hardware is ESP32-C3 SuperMini
with an Android browser for microphone input. The ESP32-S3 design is retained.

| Work | Source | Focused reference |
| --- | --- | --- |
| C3 firmware | `src/c3_main.cpp`, `include/firmware_config.h.example`, `platformio.ini` | `markdowns/c3_firmware.md`, `markdowns/c3_phone_hardware.md` |
| Legacy S3 | `src/main.cpp`, `platformio.ini` | `markdowns/firmware_setup.md` |
| Voice backend | `backend/app.py`, `backend/test_app.py` | `markdowns/phone_backend.md`, `markdowns/ai_personality_backend.md` |
| Website | `web/app`, `web/components`, `web/lib/content.ts` | `markdowns/nfc_nextjs_app.md` |
| Phone control | `web/app/control` | `markdowns/phone_control.md` |
| Gallery | `web/lib/gallery-*.ts`, `web/app/admin`, `web/app/api/gallery`, `web/scripts` | `markdowns/memory_gallery.md` |
| Enclosure | `aura_c3_compact_enclosure.scad`, `aura_enclosure.scad` | `markdowns/c3_compact_cad_spec.md` |
| Rechargeable companion CAD | `companion/Aura_R1_Main_Assembly.step`, `companion/tools/build_companion.py`, `companion/parts` | `markdowns/companion_mechanical_design.md` |
| Companion wiring / charging | `companion/research/wiring.json`, `companion/tools/build_wiring.py`, `companion/Aura_R1_Wiring_Diagram.pdf` | `markdowns/companion_wiring.md` |
| Pages deployment | `.github/workflows/pages.yml`, `web/scripts/build-pages.cjs` | `markdowns/memory_gallery.md` |

## Shared workspace protocol

1. Read the compact context and run `git status --short` once. Existing changes
   may belong to the user or another session: never discard or overwrite them.
2. Before editing, claim a unique task ID and all intended write paths:
   `powershell -NoProfile -ExecutionPolicy Bypass -File tools/agents.ps1 claim -Id gallery-fix -Task "Fix gallery loading" -Scopes web/lib/gallery-reader.ts,web/components/MemoryGallery.tsx`
3. Claims cover exact files or directory subtrees. Overlapping active claims are
   rejected. Add scopes by repeating `claim` with the same ID, full scope list,
   and the owner token returned by the first claim (`-Owner TOKEN`). Do not edit
   until the claim succeeds. IDs and tokens belong to one session only.
4. Independent tasks may run concurrently. Claim generated output directories
   too when building: `web/.next`, `web/out`, `web/tsconfig.tsbuildinfo`, or `.pio`.
   Use different ports for concurrent servers. Dependency installs must claim
   their manifests, lockfiles, and dependency directories.
5. Record progress with `note -Id ID -Owner TOKEN -Note "..."`. Finish with
   `finish -Id ID -Owner TOKEN -Note "Changed ...; checks ...; remaining ..."`.
   This releases scopes and preserves a local handoff. Never store secrets here.
6. Claims never expire automatically. After a crashed session, confirm it has
   stopped, inspect its changes, then use `release -Id ID -Note "Reason"`.
   Never release a task merely because it has been quiet.

The harness coordinates cooperating clients; it does not prevent arbitrary
programs from modifying files. All sessions in this checkout share ignored
`.agent-state/`. Separate clones/worktrees do not share this registry. Prefer
this shared checkout for disjoint edits; use isolated worktrees for overlapping
work with an explicit integration owner. Do not copy dirty changes silently.

## Multi-agent workflow

For a task that benefits from delegation, assign bounded subtasks with explicit
write scopes, dependencies, and validation. The coordinator owns integration;
each editing worker gets its own claim and token. Read-only review requires no
claim. Do not give two workers overlapping files or delegate the same work twice.
Workers return changed paths, checks, and unresolved issues. The coordinator
reviews the combined diff and runs the relevant integration checks. Respect the
runtime's agent limit; additional CLI processes are limited by machine resources.

## Validation and durable context

- Web: in `web`, `npm run typecheck` and, when needed, `npm run build`.
  Pages deployment uses `npm run build:pages`.
- Backend: in `backend`, `python -m unittest test_app` (requirements installed).
- Firmware: `pio run -e aura_esp32c3_phone`; legacy `pio run -e aura_esp32s3`.
- Harness: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/test-agents.ps1`.
- Only report checks actually run. Hardware behavior requires physical testing.
- Keep project Markdown in `markdowns/`, except `README.md` and this explicitly
  requested root `AGENTS.md`. Update this map when paths or commands change;
  claim `AGENTS.md` first. Put lasting architecture decisions in the relevant
  focused reference, and task-specific progress in the registry.
- Never read or copy secrets unnecessarily (`.env*`, firmware credentials).
- Do not commit, reset, stash, or stage another session's changes. Stage only
  owned paths when a commit is requested; coordinate shared Git operations.

See `markdowns/agent_workflow.md` for CLI examples and recovery.
