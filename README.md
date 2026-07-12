# ccbrief

A minimal, configurable **status line for [Claude Code](https://claude.com/claude-code)**.

[![CI](https://github.com/shehab267/ccbrief/actions/workflows/ci.yml/badge.svg)](https://github.com/shehab267/ccbrief/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ccbrief.svg)](https://www.npmjs.com/package/ccbrief)
[![node](https://img.shields.io/node/v/ccbrief.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/ccbrief.svg)](./LICENSE)

```
ccbrief │ ccbrief/main │ +120/-34 │ 42% ━━━━───── │ 128k │ $1.23 │ ⧗ 2h 0m │ wk 3d 4h · 62% │ high │ Opus
```

<sub>Examples here are shown without color. In your terminal, each field carries its own color — see
<a href="#colors-and-glyphs">Colors and glyphs</a>.</sub>

> **Not affiliated with, or endorsed by, Anthropic.** ccbrief is an independent, open-source project
> that reads the data Claude Code already exposes. No network calls, no telemetry.

---

## Install

```sh
npx ccbrief init
```

That copies a self-contained renderer into `~/.claude/ccbrief/`, backs up your `settings.json`, and
merges in the `statusLine` block — leaving everything else in your settings untouched. Claude Code
picks it up on the next render.

Requires **Node ≥ 22**. Works on **Windows, macOS, Linux and  WSL**.

## Update

```sh
npx ccbrief@latest init
```

**Re-running `init` is how you upgrade.** `init` *copies* the renderer into `~/.claude/ccbrief/`, so
pulling a newer version of the package on its own changes nothing — you have to run `init` again to
copy the new renderer over the old one.

It's safe to re-run: it never resets a config you've tuned, and it keeps your existing settings.

<details>
<summary>Installed globally instead?</summary>

```sh
npm install -g ccbrief@latest
ccbrief init
```
</details>

## Uninstall

```sh
npx ccbrief uninstall
```

Restores your backed-up `settings.json`, or strips just the `statusLine` block ccbrief added. It asks
before removing the `~/.claude/ccbrief/` directory.

---

## Presets

**Detailed** — the default. Everything on screen, so you can turn *off* what you don't want rather
than hunt for what you're missing.

```
ccbrief │ ccbrief/main │ +120/-34 │ 42% ━━━━───── │ 128k │ $1.23 │ ⧗ 2h 0m │ wk 3d 4h · 62% │ high │ Opus
```

**Standard** — the essentials.

```
ccbrief/main │ 42% ━━━━───── │ ⧗ 2h 0m │ Opus
```

Too wide for your terminal? ccbrief packs whole segments across up to three rows — it never splits a
segment or lets the terminal wrap mid-field:

```
ccbrief │ ccbrief/main │ +120/-34 │ 42% ━━━━───── │ 128k │ $1.23
⧗ 2h 0m │ wk 3d 4h · 62% │ high │ Opus
```

**A segment with no data is hidden, never faked.** Context % and rate limits are null early in a
session and right after `/compact` — you'll see fewer segments, never a made-up `0%`.

---

## Configure

```sh
npx ccbrief config
```

An interactive picker with a live preview. Saving also re-syncs `settings.json`, so changes take
effect on Claude Code's next render — no reinstall.

| Key | Does |
|-----|------|
| `space` | turn the focused segment on / off |
| `↑` `↓` | move between segments |
| `←` `→` | reorder the focused segment |
| `p` `g` `c` `i` `l` | cycle preset · glyphs · colors · icons · layout |
| `d` | on `repo`: show/hide the working-tree diff (`+3/-1`) |
| `t` `%` | on `fiveHour` / `weekly`: show/hide the countdown / the usage percent |
| `↵` or `s` | save and exit |
| `esc` or `q` | quit without saving |

### The config file

Lives at `~/.claude/ccbrief/config.json` (set `CLAUDE_CONFIG_DIR` to move the base directory). It's
optional — missing or malformed falls back to defaults and never breaks the status line.

| Key | Values | Default |
|-----|--------|---------|
| `preset` | `standard` · `detailed` · `custom` | `detailed` |
| `layout` | `auto` · `single-line` · `multi-line` | `auto` |
| `maxRows` | `1`–`3` | `3` |
| `glyphs` | `simple` · `emoji` · `nerd-font` · `ascii` | `simple` |
| `colors` | `true` · `false` | `true` |
| `icons` | `true` · `false` | `true` |
| `segments` | ordered list — used when `preset` is `custom` | — |

`custom` is also how you reach the segments that aren't in either preset (see the ✎ rows below):

```json
{
  "preset": "custom",
  "segments": [
    { "id": "repo", "enabled": true, "showDiff": true },
    { "id": "context", "enabled": true },
    { "id": "duration", "enabled": true },
    { "id": "fiveHour", "enabled": true, "showTime": true, "showPercent": true },
    { "id": "model", "enabled": true }
  ]
}
```

---

## Segments

Every segment hides itself when its data isn't there, so you only ever see live values.

| Segment | Shows | Hidden when |
|---------|-------|-------------|
| `directory` | Current directory (`ccbrief`) | No workspace directory |
| `repo` | Repo/branch (`ccbrief/main`); `showDiff` adds `+3/-1` | Not in a git repo |
| `context` | Context used, with a bar (`42% ━━━━─────`) | Null early in a session / after `/compact` |
| `tokens` | Tokens in context (`128k`) | Before the first response / after `/compact` |
| `cost` | Session cost (`$1.23`) | Absent |
| `fiveHour` | 5-hour limit reset (`⧗ 2h 0m`); `showPercent` adds usage | Not on Pro/Max |
| `weekly` | 7-day limit (`wk 3d 4h · 62%`) | Not on Pro/Max |
| `lines` | Lines Claude added/removed this session (`+120/-34`) | Absent |
| `effort` | Reasoning effort (`high`) | Absent |
| `model` | Active model (`Opus`) | Absent |
| ✎ `duration` | Session wall-clock (`1h 24m`) | Absent |
| ✎ `remaining` | Context left (`58% left`) | Null |
| ✎ `pr` | PR number + review state, clickable (OSC 8) | No associated PR |
| ✎ `worktree` | Active git worktree name | Not in a worktree |
| ✎ `thinking` | Thinking indicator | Thinking not enabled |
| ✎ `outputStyle` | Output style name (`concise`) | Absent |
| ✎ `agent` | Active subagent name | No active subagent |

<sub>✎ = not in either preset. Add it via <code>"preset": "custom"</code> in the config file — the
interactive picker only lists the segments your current preset contains.</sub>

The rate-limit countdown runs toward a *reset*, so it never turns red — a small number is good news.
The usage `%` beside it is the part that warns you.

---

## Colors and glyphs

**Each field has its own color, so you can find it without reading it** — context is magenta, tokens
yellow, the reset timer green, the model cyan. Color says *which field this is*. Only the context bar
and the rate-limit percent change color to signal *state* (green → yellow → red as they fill).

Colors come from the **standard ANSI palette**, never hard-coded RGB — so your terminal theme resolves
them against its own background and the line stays readable on **dark and light** themes alike.
Nothing is dimmed except separators; information is never greyed out.

Four glyph modes. `simple` is the default because it's the only one that looks the same for everyone:

```
simple    ccbrief/main │ 42% ━━━━───── │ 128k │ ⧗ 2h 0m │ high │ Opus
emoji     🌿ccbrief/main │ 42% ━━━━───── │ 🔸128k │ ⏳2h 0m │ ⚡high │ 🧠Opus
nerd-font  ccbrief/main │ 42% ━━━━───── │ 128k │ ⧗ 2h 0m │  high │  Opus
ascii     ccbrief/main | 42% ####----- | 128k | S 2h 0m | high | Opus
```

`nerd-font` **renders blank boxes unless you have a Nerd Font installed** — the picker labels it and
the live preview shows you before you commit. `ascii` drops to plain `|` and `#`.

Set `colors: false` or `icons: false` (or press `c` / `i` in the picker) to turn either off.

---

## How it works

Claude Code spawns a fresh process per update, pipes the session JSON on **stdin**, and captures
**stdout** as the status line. ccbrief is that process: one Node start, one JSON parse — replacing the
usual bash-plus-many-`jq`-spawns approach.

The installed renderer is **bundled and has zero runtime dependencies**. No network calls, no
telemetry, no `postinstall` script — nothing is installed until you run `npx ccbrief init` yourself.

It reads terminal width from `COLUMNS` (output is captured, so there's no TTY to ask) and falls back
to 80 columns. It refreshes on Claude Code's events, plus every 60s *only* when a time-based segment
is on.

---

## Development

```sh
npm test           # node --test
npm run build      # bundle the renderer → dist/statusline.js
```

Changes are logged in [CHANGELOG.md](./CHANGELOG.md). Security policy and private vulnerability
reporting: [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © shehab267. Not affiliated with or endorsed by Anthropic.
