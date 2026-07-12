# ccbrief

A minimal, configurable **status line for [Claude Code](https://claude.com/claude-code)** — one small
Node process that turns the session JSON Claude Code hands it into a tidy, colorful status line.

[![CI](https://github.com/shehab267/ccbrief/actions/workflows/ci.yml/badge.svg)](https://github.com/shehab267/ccbrief/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ccbrief.svg)](https://www.npmjs.com/package/ccbrief)
[![node](https://img.shields.io/node/v/ccbrief.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/ccbrief.svg)](./LICENSE)

> **Not affiliated with, or endorsed by, Anthropic.** ccbrief is an independent, open-source project
> that reads the data Claude Code already exposes. It makes no network calls and collects no telemetry.

```
ccbrief/main │ 42% ━━━━───── │ ⧗ 2h 0m │ Opus
```

<sub>Examples in this README use the default `simple` glyph mode and are shown without color. In your
terminal each field carries its own color — see <a href="#colors">Colors</a>.</sub>

---

## Quick start

```sh
npx ccbrief init
```

That one command:

- copies a self-contained renderer into `~/.claude/ccbrief/`,
- backs up your existing `~/.claude/settings.json`,
- merges in the `statusLine` block (leaving the rest of your settings untouched),
- and is **idempotent** — safe to run again anytime.

Claude Code picks up the new status line on its next render. That's it — no config file to hand-edit,
no shell plumbing.

> Prefer to see it first? `npx ccbrief config` opens an interactive picker with a live preview before
> you install anything.

---

## Presets

Pick a preset in the config TUI, or set `"preset"` in the config file. Every preset **hides any segment
whose data isn't available yet** — so early in a session, or right after `/compact`, you'll simply see
fewer segments rather than fake zeros.

**Detailed** _(default)_ — directory · repo · lines · context · tokens · cost · 5-hour limit · weekly limit ·
effort · model

```
ccbrief │ ccbrief/main │ +120/-34 │ 42% ━━━━───── │ 128k │ $1.23 │ ⧗ 2h 0m │ wk 3d 4h · 62% │ high
Opus
```

A fresh install starts here on purpose: everything is on screen, and turning a segment **off** in the
TUI is one keypress. Trimming what you can see beats discovering what you can't.

**Standard** — repo · context · 5-hour limit · model

```
ccbrief/main │ 42% ━━━━───── │ ⧗ 2h 0m │ Opus
```

When a line is too wide for your terminal, ccbrief packs complete segments across up to three rows
(it never splits a segment). Narrow the window and the Detailed line above simply reflows:

```
ccbrief │ ccbrief/main │ +120/-34 │ 42% ━━━━───── │ 128k
$1.23 │ ⧗ 2h 0m │ wk 3d 4h · 62% │ high │ Opus
```

---

## Features

- **Hide, don't fake.** If a source value is null — context % and rate limits are null early on and
  after `/compact` — the segment is omitted. ccbrief never renders a fabricated `0%`.
- **Layout that fits.** Segments are measured (emoji/CJK counted as 2 columns, ANSI colors as 0) and
  packed into **≤ 3 rows** against your terminal width. No terminal-wrapping surprises; a single
  oversized segment is truncated with `…` rather than split.
- **Zero runtime dependencies.** The installed renderer is bundled and fully self-contained — **no
  `jq`, no network calls, no telemetry, and no `postinstall` script.** Install happens only when you
  explicitly run `npx ccbrief init`.
- **Cross-platform.** macOS, Linux, WSL, and Windows are all first-class.
- **Clickable PRs.** The PR segment links to the pull request via terminal hyperlinks (OSC 8).
- **Swappable glyphs.** Four modes — `simple` (the default: text and universal symbols, identical on
  every terminal), `emoji`, `nerd-font`, and a pure-ASCII fallback.
- **Readable on dark *and* light themes.** Colors come from the standard ANSI palette, so your
  terminal theme resolves them against its own background instead of ccbrief imposing fixed RGB that
  only suits one. Each field gets its own color; only gauges change color to signal state.

---

## Configuration

Open the interactive TUI to toggle segments, reorder them, switch presets, and preview live:

```sh
npx ccbrief config
```

| Key | Does |
|-----|------|
| `space` | turn the focused segment on / off |
| `↑` `↓` | move between segments |
| `←` `→` | reorder the focused segment |
| `p` `g` `c` `i` `l` | cycle preset · glyphs · colors · icons · layout |
| `↵` or `s` | save and exit |
| `esc` or `q` | quit without saving |

Saving writes your config **and** re-syncs `settings.json`, so a change takes effect on Claude Code's
next render — no reinstall. Re-running `npx ccbrief init` never overwrites a config you've tuned.

Settings are stored at `~/.claude/ccbrief/config.json` (override the base directory with the
`CLAUDE_CONFIG_DIR` environment variable). The file is optional — a missing or malformed config falls
back to sensible defaults and never breaks the status line.

| Key | Values | Default | What it does |
|-----|--------|---------|--------------|
| `preset` | `standard` · `detailed` · `custom` | `detailed` | Named segment set. `custom` uses your `segments` list. |
| `layout` | `auto` · `single-line` · `multi-line` | `auto` | How segments are packed into rows. |
| `maxRows` | `1`–`3` | `3` | Maximum rows the status line may occupy. |
| `glyphs` | `simple` · `emoji` · `nerd-font` · `ascii` | `simple` | Icon style. |
| `colors` | `true` · `false` | `true` | ANSI color output. |
| `icons` | `true` · `false` | `true` | Show segment icons/glyphs. |
| `segments` | `[{ "id", "enabled" }]` | — | Ordered segment list (used when `preset` is `custom`). |

### Glyph styles

`simple` is the default because it's the only mode that looks the same for everyone — text plus
universal symbols, no font to install. `emoji` adds icons. `nerd-font` uses Nerd Font icons and
**renders blank boxes without a Nerd Font installed**, so the TUI labels it as such and the live
preview shows you before you commit. `ascii` drops to pure `|`/`#` for terminals with limited glyph
support.

```
simple    : ccbrief │ ccbrief/main +120/-34 │ 42% ━━━━───── │ 128k │ $1.23 │ ⧗ 2h 0m │ high │ Opus
emoji     : ccbrief │ 🌿 ccbrief/main +120/-34 │ 42% ━━━━───── │ 🔸 128k │ $1.23 │ ⏳ 2h 0m │ ⚡ high │ 🧠 Opus
nerd-font : ccbrief │  ccbrief/main +120/-34 │ 42% ━━━━───── │ 128k │ $1.23 │ ⧗ 2h 0m │  high │  Opus
ascii     : ccbrief | ccbrief/main +120/-34 | 42% ####----- | 128k | $1.23 | S 2h 0m | high | Opus
```

The reset timer is the one glyph that differs by mode on purpose: `emoji` gets ⏳, while every other
mode keeps ⧗ — a monochrome symbol that ships with every font and is drawn single-width everywhere.
So the richer glyph is opt-in and no mode ever leaves you with an empty box.

### Colors

**Each field has its own color, so you can find it without reading it** — tokens are yellow, the
reset timer is green, context is magenta, the model is cyan. Color marks *which field this is*;
only the context bar and the rate-limit percentage change color to signal *state* (green → yellow →
red as they fill).

ccbrief paints with the **standard ANSI palette**, never with hard-coded RGB. That means your
terminal theme resolves every color against its own background, so the line stays readable on a dark
theme **and** on a light one, and it looks like it belongs in the theme you already chose. Nothing is
dimmed except the separators — information is never greyed out.

Set `colors: false` (or press `c` in the TUI) to drop every escape code and render plain text.

---

## Segments

Every segment hides automatically when its source field is absent, so you only ever see live data.

### Core

| Segment | Shows | Hidden when |
|---------|-------|-------------|
| `directory` | Current directory name | No workspace directory |
| `repo` | Repo/branch (`ccbrief/main`); press `d` in the TUI to add the diff (`+3/-1`) | Not in a git repo |
| `context` | Context window used %, with a bar | Null early in a session / after `/compact` |
| `model` | Active model name (`Opus 4.8`) | Absent |

### Usage

| Segment | Shows | Hidden when |
|---------|-------|-------------|
| `tokens` | Tokens in context (e.g. `170k`) | Before the first response / after `/compact` |
| `remaining` | Context percent remaining (`58% left`) | Null |
| `duration` | Session wall-clock (`1h 24m`) | Absent |
| `cost` | Session cost (`$1.23`) | Absent |
| `fiveHour` | Time until the 5-hour limit resets (`⧗ 2h 0m`); `%` adds usage (`⧗ 2h 0m · 40%`). The countdown runs to a *reset*, so it never turns red — the usage `%` is what warns you | Not on Pro/Max |
| `weekly` | 7-day limit (`wk 3d 4h · 62%`) | Not on Pro/Max |

### Development

| Segment | Shows | Hidden when |
|---------|-------|-------------|
| `lines` | Session lines added/removed (`+120/-34`) | Absent |
| `pr` | PR number + review state (clickable) | No associated PR |
| `worktree` | Active git worktree name | Not in a worktree |

### Claude

| Segment | Shows | Hidden when |
|---------|-------|-------------|
| `effort` | Reasoning effort level (`high`) | Absent |
| `thinking` | Thinking indicator (`thinking`) | Thinking not enabled |
| `outputStyle` | Output style name (`concise`) | Absent |
| `agent` | Active subagent name | No active subagent |

---

## How it works

Claude Code spawns a fresh process per status-line update, pipes the session JSON on **stdin**, and
captures **stdout** as the status line. ccbrief is that process: one Node start, one JSON parse — a
single self-contained script that replaces the traditional bash-and-many-`jq`-spawns approach.

The renderer reads terminal width from the `COLUMNS` environment variable (output is captured, so there
is no TTY to query) and falls back to 80 columns when it's unset. It refreshes on Claude Code's events,
and every 60s only when a time-based segment (duration or a rate-limit window) is enabled.

---

## Platform support

| Platform | Supported |
|----------|-----------|
| macOS | ✅ |
| Linux | ✅ |
| WSL | ✅ |
| Windows | ✅ |

Requires **Node ≥ 22**. CI runs the full test suite on Node 22 and 24 across macOS, Linux, and Windows.

---

## Uninstall

```sh
npx ccbrief uninstall
```

Restores your backed-up `settings.json` if one exists, or otherwise strips only the `statusLine` block
that ccbrief added. It asks whether to also remove the `~/.claude/ccbrief/` renderer directory.

---

## Development

```sh
npm test           # run the test suite (node --test)
npm run build      # bundle the renderer with esbuild → dist/statusline.js
```

Security policy and private vulnerability reporting: see [SECURITY.md](./SECURITY.md).

---

## License

[MIT](./LICENSE) © shehab267. Not affiliated with or endorsed by Anthropic.
