// ANSI colors + glyph tables. `ascii` mode is the guaranteed-safe fallback —
// emoji and Nerd Font glyph widths vary across terminals, so ascii is always kept.

// Accents are 24-bit TRUECOLOR (`38;2;r;g;b`), not the ANSI palette slots (the
// 90s): a palette slot is only a *name* the user's terminal theme maps to its
// own hue, so the same "green" looked lime in one terminal and forest in another
// — the exact cross-terminal drift we're removing. Pinning RGB makes every
// state colour identical on any terminal (the "same experience for all users"
// goal). 24-bit is near-universal on the terminals that run Claude Code; a rare
// terminal without it just ignores the sequence and shows plain readable text.
// Values are sampled from the terminal rendering the user finds easy on the eyes
// (a lime green, a vivid red, a warm gold), so the palette reproduces what reads
// well to them rather than an arbitrary set; `orange` is a derived amber, one
// step warmer than `yellow`. The reset countdown warms yellow → `orange` but
// never to red — an imminent reset is relief, not danger — so the alarm reds
// have no caller and stay absent.
//
// `dim`/`bold` deliberately STAY as SGR attributes, not RGB: `dim` (SGR 2) is
// the muted grey for identity text and separators, and it must *adapt* to the
// user's background (softens relative to it, never inverts on a light theme). A
// hardcoded grey would ignore the background and risk vanishing on a matching
// one — so only the state colours are pinned; the chrome keeps adapting.
const SGR = {
  dim: 2, bold: 1,
  red: '38;2;236;37;61', green: '38;2;169;222;90', yellow: '38;2;245;203;65',
  blue: '38;2;88;166;255', magenta: '38;2;188;140;255', cyan: '38;2;57;197;207',
  orange: '38;2;239;157;43',
}

// Four glyph modes. `simple` is the DEFAULT and the only one identical for every
// user: it has NO pictographs (no emoji or Nerd glyph renders the same across
// fonts) — just text plus the one monochrome symbol every font ships, the ⧗
// reset timer. `emoji` looks richest but each OS draws its own artwork and width.
// `nerd-font` renders blank unless a patched Nerd Font is installed. `ascii` is
// the pure-ASCII floor (no box-drawing at all). `reset` is a sand-timer (⧗, not
// the ⏳ emoji) so the countdown segment can paint it with its urgency colour.
const GLYPHS = {
  simple:      { branch: '', duration: '', cost: '', effort: '', model: '', thinking: '', pr: '', worktree: '', reset: '⧗' },
  emoji:       { branch: '🌿', duration: '⏱', cost: '💰', effort: '⚡', model: '🧠', thinking: '💭', pr: '🔎', worktree: '🌲', reset: '⧗' },
  // Nerd Font Private-Use code points (Powerline + Font Awesome ranges) — render
  // ONLY with a Nerd Font installed, else blank; the TUI labels this mode and its
  // live preview is the real check. Unverifiable here (no Nerd Font on this box).
  'nerd-font': { branch: '\ue0a0', duration: '\uf017', cost: '\uf155', effort: '\uf0e7', model: '\uf2db', thinking: '\uf075', pr: '\uf002', worktree: '\uf1bb', reset: '⧗' },
  ascii:       { branch: '', duration: '', cost: '', effort: '', model: '', thinking: '', pr: '', worktree: '', reset: '' },
}

const BAR = {
  simple:      { full: '━', empty: '─' },
  emoji:       { full: '━', empty: '─' },
  'nerd-font': { full: '━', empty: '─' },
  ascii:       { full: '#', empty: '-' },
}

const SEP = { simple: ' │ ', emoji: ' │ ', 'nerd-font': ' │ ', ascii: ' | ' }

export function makeTheme({ glyphs = 'simple', colors = true, icons = true } = {}) {
  const mode = GLYPHS[glyphs] ? glyphs : 'simple'
  const bars = BAR[mode]
  const rawSep = SEP[mode]
  return {
    colors,
    icons,
    // Dim the separators when colors are on so the chrome recedes and the
    // identity/value text reads as the foreground (the visual hierarchy the
    // reference status line has). width.js strips SGR, so this is zero-width.
    sep: colors ? `\x1b[${SGR.dim}m${rawSep}\x1b[0m` : rawSep,
    glyph(name) {
      if (!icons) return ''
      return GLYPHS[mode][name] ?? ''
    },
    color(name, str) {
      if (!colors || !SGR[name]) return str
      return `\x1b[${SGR[name]}m${str}\x1b[0m`
    },
    // Two registers now: muted grey text, and bright colour reserved for state.
    // Identity text is toned to grey with `dim` (SGR 2) rather than left at the
    // terminal's default foreground — that default is a glaring pure-white on
    // most dark themes. `dim` softens it *relative to the background* instead of
    // hardcoding a light colour, so it never inverts: still grey-not-white on
    // dark, still readable on light. State colour (gauge, urgency, +/- diffs) is
    // the only thing that stays bright, so the eye goes straight to it.
    primary(str) {
      return this.color('dim', str)
    },
    // Supporting values (tokens, cost, duration) share the same muted grey — the
    // colour that signals state is what should carry the eye, not the numbers.
    secondary(str) {
      return this.color('dim', str)
    },
    // A progress gauge, not just a bar: with a tone, the filled run takes that
    // color and the remainder is dimmed, so fill level reads at a glance.
    // No tone / colors off → the plain bar (keeps snapshots and ascii mode).
    bar(pct, width = 9, tone) {
      const clamped = Math.max(0, Math.min(100, Number(pct) || 0))
      const filled = Math.round((clamped / 100) * width)
      const full = bars.full.repeat(filled)
      const empty = bars.empty.repeat(width - filled)
      if (!colors || !tone) return full + empty
      return this.color(tone, full) + this.color('dim', empty)
    },
  }
}
