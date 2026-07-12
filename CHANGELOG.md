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
- **Color marks *which field* you're looking at, not just whether something is
  wrong.** Each field carries its own hue — directory cyan, tokens yellow,
  context magenta, the reset timer green, the model cyan. Previously everything
  was dim grey and color was reserved for state, which read as monotone and
  washed out. Only the context bar and the rate-limit percentage still change
  color to signal state (green → yellow → red as they fill).
- **Colors come from the standard ANSI palette, never hard-coded RGB**, so the
  line is readable on dark **and** light terminal themes. A pinned RGB value is
  tuned against one background: measured on Solarized Light, the greens and
  yellows previously shipped sat at ~1.5:1 contrast — effectively invisible. An
  ANSI slot is resolved by the user's own terminal theme against its own
  background, so it is legible by construction and matches the theme they chose.
  Bright slots (90–97) are avoided for the same reason: they are defined as
  *lighter*, so they wash out on white.
- **Identity text is no longer dimmed.** It sits at the terminal's default
  foreground — the one color the user already picked to read text in. Dim is now
  chrome only (separators, a bar's unspent run); information is never greyed out.
- **The rate-limit countdown has no red state.** It counts down to the moment
  quota *resets*, so a small number is good news; the old ramp painted
  approaching relief as approaching danger. The usage percentage next to it keeps
  its green/yellow/red scale and remains the actual warning.
- **`detailed` is the default preset**, and the `minimal` preset is gone. A fresh
  install now shows every segment so it can be trimmed in the TUI, rather than
  hiding segments behind a config file. A config still naming `minimal` degrades
  to the default instead of erroring.
- **`esc` quits the config TUI**, alongside `q`.

### Fixed
- **Icons are no longer double-spaced from the values they label.** An emoji is
  double-width, so the terminal already reserves a trailing column its artwork
  doesn't fill — and every segment was appending a space on top of that. Emoji
  icons sat two columns clear of their value while single-width glyphs sat one.
  The gap now belongs to the glyph: nothing after a double-width emoji, a space
  after anything narrower (`⧗`, Nerd Font points) and after the `wk` / `S` word
  fallbacks.
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
