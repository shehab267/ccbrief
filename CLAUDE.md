# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`ccbrief` is a minimal, configurable **status line for Claude Code** — a Node CLI (`npx ccbrief <cmd>`)
that installs a renderer into `~/.claude/ccbrief/` and wires it into `settings.json`. Independent
open-source project; not affiliated with Anthropic.

**Current state: scaffold.** `bin/ccbrief.js` and `src/statusline.js` are working stubs; most of the
architecture below (`render.js`, `segments/`, `layout.js`, `config.js`, `theme.js`, `installer.js`,
`tui/`) is planned, not yet built. The authoritative roadmap — segment catalog, config schema,
installer behavior, and ordered milestones — lives in
`docs/superpowers/specs/2026-07-07-ccbrief-design.md`. **Read that spec before implementing any new
segment, layout, or installer feature.** (`docs/` is gitignored going forward, but the file is tracked.)

## Commands

- **Build:** `npm run build` — esbuild bundles `src/statusline.js` → `dist/statusline.js`.
  (Per user preference, do not run the build unless explicitly asked.)
- **Test:** `npm test` (= `node --test`, discovers `test/**/*.test.js`).
- **Single test file:** `node --test test/smoke.test.js`.
- **Run the renderer by hand:**
  `echo '{"workspace":{"current_dir":"/a/b"},"model":{"display_name":"Opus"}}' | node src/statusline.js`
- No linter/formatter is configured — match existing style by hand.

## Architecture (the parts that span files)

Two surfaces share one core:

1. **Renderer** — Claude Code spawns a fresh Node process per update, pipes session JSON on **stdin**,
   and captures **stdout** as the status line. One process, one JSON parse (replaces the old bash +
   ~20 `jq` spawns). Entry: `src/statusline.js` today; the plan is a pure `render.js: (input, config) → string`.
2. **CLI** — `ccbrief init | config | uninstall` (`bin/ccbrief.js`) installs the bundled renderer,
   patches `settings.json`, and runs the config TUI.

**Why the renderer is bundled (`dist/statusline.js`):** `init` copies this file into `~/.claude/ccbrief/`,
where it must keep working after the ephemeral `npx` cache is evicted. So it must be **fully
self-contained with zero runtime dependencies** — `string-width` is inlined by esbuild at build time.
Never add a runtime `import` to the renderer path that isn't bundled.

**Single source of truth (planned):** the same `render.js` function drives both the real status line
and the TUI live preview, and snapshot-test fixtures *are* the TUI's fixed dummy data. So render
correctness, preview correctness, and test correctness are one guarantee. Preserve this when building
the TUI and tests — don't fork the rendering path.

**Width & layout:** `src/width.js` wraps bundled `string-width` (ANSI SGR stripped, emoji/CJK = 2 cols).
The layout engine measures with this and **packs complete segments into ≤3 rows against `COLUMNS`** —
it never relies on terminal wrapping and **never splits a segment** (a single oversized segment is
truncated with `…`). Read terminal width from the `COLUMNS` env var, not `tput`/TTY detection (output
is captured, so there is no TTY). If `COLUMNS` is unset, assume 80 and stay single-line-safe.

## Non-negotiable invariants

- **Never crash Claude's UI.** Malformed/absent stdin → emit an empty line, not an error.
- **Hide, don't fake.** Any null/absent source field → omit that segment. **Never fabricate values** —
  in particular, never render a fake `0%` for context or rate-limit segments when the source is null
  (these are null early in a session and post-`/compact`).
- **Zero runtime deps in the shipped renderer**, no network calls, no telemetry, no `postinstall` script — ever.
- **Cross-platform is a first-class target** (CI runs on Windows too): resolve `%USERPROFILE%\.claude`,
  forward-slash the `statusLine.command`, and spawn `git` cross-platform.

## Conventions

- Node **>=22**, **ESM** (`import`, top-level `await`), plain JavaScript (no TypeScript).
- Code style: 2-space indent, **no semicolons**, single quotes — match the existing files.
- Comment on the *why* (the null-hiding, bundling, and COLUMNS decisions all have non-obvious reasons).
- CI matrix: Node 22 & 24 × macOS/Linux/Windows (`.github/workflows/ci.yml`).
- Commit as the user with no AI fingerprint.
