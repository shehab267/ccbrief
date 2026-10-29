# ccbrief: a minimal status line for Claude Code

A minimal, configurable status line (statusline) for [Claude Code](https://claude.com/claude-code). It
shows your context window, tokens, session cost and rate-limit usage in your terminal. Install it from
[npm](https://www.npmjs.com/package/ccbrief) with one command: `npx ccbrief init`.

[![CI](https://github.com/shehab267/ccbrief/actions/workflows/ci.yml/badge.svg)](https://github.com/shehab267/ccbrief/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ccbrief.svg)](https://www.npmjs.com/package/ccbrief)
[![node](https://img.shields.io/node/v/ccbrief.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/ccbrief.svg)](./LICENSE)

![A terminal running `npx ccbrief init`, which installs ccbrief and prints a preview of the status
line. Then `npx ccbrief config` opens the picker, which switches to the detailed preset and back to
standard, turns on the session cost segment, moves it next to the context bar, cycles the symbol sets,
turns icons off and on, and saves. The preview updates on every keypress, and a badge on the right
names each key as it is pressed.](https://raw.githubusercontent.com/shehab267/ccbrief/main/assets/ccbrief-demo.gif)

<sub>Install, then choose what it shows. The badge on the right shows each key as it is pressed.</sub>

![The ccbrief status line for Claude Code, showing directory, git branch, lines changed, context-window
usage with a bar, tokens, session cost, 5-hour and weekly rate-limit resets, reasoning effort and the
active model. The same line is shown on a dark and a light terminal theme.](https://raw.githubusercontent.com/shehab267/ccbrief/main/assets/ccbrief-claude-code-statusline.png)

```
ccbrief │ ccbrief/main │ +120/-34 │ 42% ━━━━───── │ 128k │ $1.23 │ ⏳2h 0m · 40% │ wk 3d 4h · 62% │ high │ Opus 5.5
```

<sub>The same line on a dark and a light terminal. Each theme picks the exact shades. See
<a href="#colors-and-symbols">Colors and symbols</a>.</sub>

> **Not affiliated with, or endorsed by, Anthropic.** ccbrief is an independent, open-source project
> that reads the data Claude Code already provides. It makes no network calls and sends no telemetry.

[Docs website](https://shehab267.github.io/ccbrief/) · [npm](https://www.npmjs.com/package/ccbrief) · [Install](#install) · [Update](#update) · [Uninstall](#uninstall) · [Presets](#presets) · [Configure](#configure) · [Segments](#segments) · [Colors and symbols](#colors-and-symbols) · [FAQ](#faq)

## Install

```sh
npx ccbrief init
```

This copies a self-contained renderer into `~/.claude/ccbrief/`, backs up your `settings.json`, and
adds the `statusLine` block to it. The rest of your settings stay as they are. When it finishes, it
shows a preview and the next steps.

You don't need to restart. Claude Code reloads its settings on its own, so the status line appears the
next time you interact with it.

Requires Node 22 or newer. Works on Windows, macOS, Linux and WSL.

## Update

```sh
npx ccbrief@latest init
```

Running `init` again is how you upgrade. It copies the renderer into `~/.claude/ccbrief/`, so a newer
package has no effect until you run it. It's safe to re-run: your config and your other settings are
kept.

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

This restores your backed-up `settings.json`, or removes only the `statusLine` block ccbrief added. It
asks before deleting the `~/.claude/ccbrief/` directory.

## Presets

`standard` is the default. It shows where you are, how full the context is, when your limit resets and
how much of it you've used, and which model you're on.

```
ccbrief/main │ 42% ━━━━───── │ ⏳2h 0m · 40% │ Opus 5.5
```

`detailed` adds the folder name, lines changed, tokens, session cost, the weekly limit and reasoning
effort. Press `p` in the picker to switch to it, then turn off anything you don't need.

```
ccbrief │ ccbrief/main │ +120/-34 │ 42% ━━━━───── │ 128k │ $1.23 │ ⏳2h 0m · 40% │ wk 3d 4h · 62% │ high │ Opus 5.5
```

If the line is wider than your terminal, ccbrief moves whole segments onto up to three rows. A segment
is never split, and the terminal never wraps it halfway:

```
ccbrief │ ccbrief/main │ +120/-34 │ 42% ━━━━───── │ 128k │ $1.23
⏳2h 0m · 40% │ wk 3d 4h · 62% │ high │ Opus 5.5
```

Segments with no data are hidden. Context % and rate limits are null early in a session and right
after `/compact`, so ccbrief leaves them out until Claude Code reports a value. It never shows a
placeholder `0%`.

## Configure

```sh
npx ccbrief config
```

This opens an interactive picker with a live preview. It lists every segment, the ones you show first
and then the rest, each with a plain-English name next to its id (so you can tell what `fiveHour`
means):

```
Segments — 4 of 15 shown ──────────────────────────────
▸ [x] repo        repository / branch  diff ○
  [x] context     context used
  [x] fiveHour    session limit (5h)   time ●  percent ●
  [x] model       model
  [ ] directory   current folder
  [ ] pr          pull request
  ...
```

Saving also updates `settings.json`, so your changes appear on Claude Code's next render. You don't
need to reinstall.

| Key | Does |
|-----|------|
| `space` | show or hide the focused segment |
| `↑` `↓` | move between segments |
| `←` `→` | move the focused segment left or right |
| `p` `y` `c` `i` `l` | change preset, symbols, colors, icons, layout |
| `d` | on `repo`: show or hide the working-tree diff (`+3/-1`) |
| `t` `%` | on `fiveHour` and `weekly`: show or hide the countdown (`t`) or the usage percent (`%`) |
| `↵` | save and exit |
| `esc` | quit without saving |

### The config file

The config lives at `~/.claude/ccbrief/config.json`. Set `CLAUDE_CONFIG_DIR` to move the base
directory. The file is optional: if it's missing or malformed, ccbrief uses the defaults and the
status line keeps working.

| Key | Values | Default |
|-----|--------|---------|
| `preset` | `standard`, `detailed` or `custom` | `standard` |
| `layout` | `auto`, `single-line` or `multi-line` | `auto` |
| `maxRows` | `1` to `3` | `3` |
| `symbols` | `simple`, `emoji`, `nerd-font` or `ascii` | `simple` |
| `colors` | `true` or `false` | `true` |
| `icons` | `true` or `false` | `true` |
| `segments` | ordered list, read only when `preset` is `custom` | none |

<sub><code>symbols</code> was called <code>glyphs</code> in older versions. Old configs still work:
ccbrief reads <code>glyphs</code> as <code>symbols</code>.</sub>

The picker writes this file for you. A hand-written `custom` config looks like this:

```json
{
  "preset": "custom",
  "segments": [
    { "id": "repo", "enabled": true, "showDiff": true },
    { "id": "context", "enabled": true },
    { "id": "fiveHour", "enabled": true, "showTime": true, "showPercent": true },
    { "id": "model", "enabled": true }
  ]
}
```

A named preset (`standard` or `detailed`) has its own fixed list, so a `segments` key next to it does
nothing. Unknown ids are ignored.

## Segments

Each segment hides itself when its data is missing.

| Segment | Shows | Hidden when |
|---------|-------|-------------|
| `directory` | Current directory (`ccbrief`) | No workspace directory |
| `repo` | Repo and branch (`ccbrief/main`); `showDiff` adds `+3/-1` | Not in a git repo |
| `context` | Context used, with a bar (`42% ━━━━─────`) | Early in a session, or after `/compact` |
| `tokens` | Tokens in context (`128k`) | Before the first response, or after `/compact` |
| `cost` | Session cost (`$1.23`) | No data |
| `fiveHour` | Session limit: reset countdown and usage (`⏳2h 0m · 40%`) | Not on Pro or Max |
| `weekly` | Weekly limit: reset countdown and usage (`wk 3d 4h · 62%`) | Not on Pro or Max |
| `lines` | Lines Claude added and removed this session (`+120/-34`) | No data |
| `effort` | Reasoning effort (`high`) | No data |
| `model` | Active model (`Opus 5.5`) | No data |
| `pr` | PR number and review state, as a clickable link (OSC 8) | No PR for the branch |
| `worktree` | Active git worktree name | Not in a worktree |
| `thinking` | Thinking indicator | Thinking is off |
| `outputStyle` | Output style name (`concise`) | No data |
| `agent` | Active subagent name | No subagent running |

<sub>The last five aren't in either preset. The picker still lists them, and <code>space</code> turns
one on.</sub>

The rate-limit countdown shows the time left until your limit resets, so it never turns red: a small
number means the reset is close. The usage % next to it is the part that changes color as you use up
the limit.

## Colors and symbols

Each field has its own color so you can find it at a glance: context is magenta, tokens yellow, the
reset timer green and the model cyan. Only the context bar and the rate-limit percent change color with
their value, going from green to yellow to red as they fill.

ccbrief uses the standard ANSI palette instead of fixed RGB values, so your terminal theme sets the
exact shades and the line stays readable on dark and light themes. Only the separators are dimmed.

There are four symbol sets. Each one sets the icons, the bar characters and the separator. `simple`
is the default: plain text plus the ⏳ timer, with no special font needed.

```
simple    ccbrief/main │ 42% ━━━━───── │ 128k │ ⏳2h 0m · 40% │ high │ Opus 5.5
emoji     🌿ccbrief/main │ 42% ━━━━───── │ 🔸128k │ ⏳2h 0m · 40% │ ⚡high │ 🧠Opus 5.5
nerd-font   ccbrief/main │ 42% ━━━━───── │ 128k │ ⧗ 2h 0m · 40% │  high │  Opus 5.5
ascii     ccbrief/main | 42% ####----- | 128k | S 2h 0m · 40% | high | Opus 5.5
```

`nerd-font` shows blank boxes unless you have a Nerd Font installed. The picker marks it, and the live
preview lets you check it before you save. `ascii` uses plain `|` and `#`. If the ⏳ timer shows as a
box, your terminal has no emoji font, so pick `ascii`.

To turn colors or icons off, set `colors: false` or `icons: false`, or press `c` or `i` in the picker.

## How it works

Claude Code starts a new process for each update, sends the session JSON on stdin, and shows whatever
the process prints to stdout as the status line. ccbrief is that process. Each update costs one Node
start and one JSON parse, where a typical bash status line runs `jq` many times.

The installed renderer is a single bundled file with no runtime dependencies. ccbrief makes no network
calls, sends no telemetry and has no `postinstall` script. Nothing is installed until you run
`npx ccbrief init` yourself.

ccbrief reads the terminal width from `COLUMNS`, because Claude Code captures the output and there is
no TTY to ask. If `COLUMNS` isn't set, it assumes 80 columns. The line redraws on Claude Code's events,
and also every 60 seconds while a time-based segment is on.

## FAQ

**How do I add a status line to Claude Code?**
Run `npx ccbrief init`. It writes the renderer to `~/.claude/ccbrief/`, backs up your `settings.json`,
and adds a `statusLine` block to it. You don't need to restart Claude Code: the line appears the next
time you interact with it.

**Why did my context percentage disappear?**
Claude Code hasn't reported it yet. `used_percentage` is null early in a session and right after
`/compact`, so ccbrief hides the segment instead of showing `0%`. It comes back after the next response.

**Can I see my 5-hour and weekly rate limits?**
Yes. The `fiveHour` and `weekly` segments show the reset countdown and the percent used. Claude Code
only reports rate limits on Pro and Max plans, so on other plans those segments stay hidden.

**Does it work on Windows?**
Yes. It runs on Windows, WSL, macOS and Linux with Node 22 and 24. CI runs the full test suite on
Windows, macOS and Linux.

**How is this different from a shell script with `jq`?**
A typical bash status line runs `jq` once per field, about twenty processes on every render. ccbrief
is one Node process that parses the session JSON once, and it has no runtime dependencies.

**Can I choose which segments to show?**
Yes. Run `npx ccbrief config`. It lists all fifteen segments with a live preview. See
[Segments](#segments).

## Development

```sh
npm test           # node --test
npm run build      # bundle the renderer → dist/statusline.js
npm run demo       # regenerate the README images from the real renderer
```

Changes are listed in [CHANGELOG.md](./CHANGELOG.md). For the security policy and private
vulnerability reporting, see [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © shehab267. Not affiliated with or endorsed by Anthropic.
