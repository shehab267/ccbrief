# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Status line renderer** — a single Node process that reads Claude Code's
  session JSON on stdin and emits the status line on stdout, replacing the
  traditional bash + `jq` approach. Bundled to `dist/statusline.js` with esbuild
  so the installed copy has zero runtime dependencies.
- **Segments** — 17 segments across four sections: core (directory, repo,
  context, model), usage (tokens, remaining, duration, cost, 5-hour and 7-day
  rate-limit windows), development (lines, PR, worktree), and Claude session
  (effort, thinking, output style, agent). Each hides when its source field is
  absent — never a fabricated value.
- **Layout engine** — width-aware packing (emoji/CJK counted as 2 columns, ANSI
  as 0) into up to three rows against `COLUMNS`, never splitting a segment;
  oversized segments are ellipsis-truncated. `auto`, `single-line`, and
  `multi-line` modes.
- **Configuration** — `standard` and `detailed` presets plus a `custom` mode;
  toggles for glyph style, colors, icons, layout, and max rows. A
  forward-compatible loader falls back to defaults on any invalid field.
- **CLI** — `ccbrief init` (settings backup + idempotent merge, with confirmation
  before replacing an existing status line), `ccbrief uninstall` (restore the
  backup or strip only the added block), and `ccbrief config` (interactive TUI
  whose live preview is driven by the same render function as the real status
  line).
- **Cross-platform support** — macOS, Linux, WSL, and Windows: `%USERPROFILE%`
  resolution and a forward-slashed, shell-safe `statusLine.command`.
- **Documentation** — README (install, preset gallery, segment catalog, config
  reference) and SECURITY.md.

### Changed
- **`detailed` is the default preset**, and the `minimal` preset is gone. A fresh
  install now shows every segment so it can be trimmed in the TUI, rather than
  hiding segments behind a config file. A config still naming `minimal` degrades
  to the default instead of erroring.
- **`esc` quits the config TUI**, alongside `q`.

### Fixed
- **`ccbrief init` no longer resets a config you've tuned.** Re-running it kept
  overwriting `config.json` with the defaults; it now only writes that file when
  it is missing or unparseable, and derives `refreshInterval` from the config it
  keeps.
- **`ccbrief config` now re-syncs `settings.json`.** Saving only wrote
  `config.json`, so adding or removing a time-based segment left the status line
  polling at the old rate (or not at all) until the next `init`. It never writes
  over a `statusLine` it doesn't own.

### Security
- No network calls, no telemetry, and no `postinstall` script; the shipped
  renderer has zero runtime dependencies. Session-derived values are stripped of
  control characters before rendering, and PR links are wrapped as terminal
  hyperlinks only for `http(s)` URLs.
