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
- **Configuration** — `minimal`, `standard`, and `detailed` presets plus a
  `custom` mode; toggles for glyph style, colors, icons, layout, and max rows.
  A forward-compatible loader falls back to defaults on any invalid field.
- **CLI** — `ccbrief init` (settings backup + idempotent merge, with confirmation
  before replacing an existing status line), `ccbrief uninstall` (restore the
  backup or strip only the added block), and `ccbrief config` (interactive TUI
  whose live preview is driven by the same render function as the real status
  line).
- **Cross-platform support** — macOS, Linux, WSL, and Windows: `%USERPROFILE%`
  resolution and a forward-slashed, shell-safe `statusLine.command`.
- **Documentation** — README (install, preset gallery, segment catalog, config
  reference) and SECURITY.md.

### Security
- No network calls, no telemetry, and no `postinstall` script; the shipped
  renderer has zero runtime dependencies. Session-derived values are stripped of
  control characters before rendering, and PR links are wrapped as terminal
  hyperlinks only for `http(s)` URLs.
