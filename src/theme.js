// ANSI colors + symbol tables. `ascii` mode is the guaranteed-safe fallback —
// emoji and Nerd Font symbol widths vary across terminals, so ascii is always kept.
import { visibleWidth } from './width.js'

// Accents are the NORMAL ANSI palette slots (31-36) — deliberately not 24-bit
// truecolor, and deliberately not the bright slots (90-97).
//
// A palette slot is a *name* the user's terminal theme resolves against its own
// background, so slot 32 is a green the theme already guarantees is legible on
// ITS background — dark or light. Pinned RGB cannot make that guarantee: a lime
// tuned against a black terminal is unreadable on a white one, and it overrides
// a palette the user deliberately chose. The bright slots are the same trap in
// miniature: they are *defined* as lighter, so they wash out on a light
// background. Restricting accents to the normal slots is what keeps the line
// readable under both themes. (`orange` has no palette slot, and its only caller
// — the countdown's urgency ramp — is gone, so it's dropped.)
//
// `dim`/`bold` stay SGR *attributes* rather than colours: both are defined
// relative to the current foreground, so they adapt to any background. `dim` is
// the chrome grey; `bold` lifts a hue without hardcoding a brighter one.
const SGR = {
  dim: 2, bold: 1,
  red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36,
  // Bold cyan stands in for bright cyan (96), which is what the reference line
  // used for the model. Same hue, lifted relative to the foreground instead of
  // hardcoded lighter — so it survives a light background.
  cyanBold: '1;36',
}

// Four symbol sets. `simple` is the DEFAULT and the only one identical for every
// user: it has NO pictographs (no emoji or Nerd Font icon renders the same across
// fonts) — just text plus the one monochrome symbol every font ships, the ⧗
// reset timer. `emoji` looks richest but each OS draws its own artwork and width.
// `nerd-font` renders blank unless a patched Nerd Font is installed. `ascii` is
// the pure-ASCII floor (no box-drawing at all).
//
// The countdown carries a timer in every set, but a *different* one per set,
// and that split is the cross-terminal fallback: `emoji` gets the ⏳ of the
// reference line, while `simple` — the default — keeps ⧗, a monochrome symbol
// every font ships and every terminal draws single-width. ⏳ is an emoji, so its
// artwork and column width are the terminal's choice. The rich symbol is opt-in;
// nobody lands on tofu by default.
const SYMBOLS = {
  simple:      { branch: '', tokens: '', cost: '', effort: '', model: '', thinking: '', pr: '', worktree: '', reset: '⧗' },
  emoji:       { branch: '🌿', tokens: '🔸', cost: '💰', effort: '⚡', model: '🧠', thinking: '💭', pr: '🔎', worktree: '🌲', reset: '⏳' },
  // Nerd Font Private-Use code points (Powerline + Font Awesome ranges) — render
  // ONLY with a Nerd Font installed, else blank; the picker labels this mode and its
  // live preview is the real check. Unverifiable here (no Nerd Font on this box).
  'nerd-font': { branch: '\ue0a0', tokens: '', cost: '\uf155', effort: '\uf0e7', model: '\uf2db', thinking: '\uf075', pr: '\uf002', worktree: '\uf1bb', reset: '⧗' },
  ascii:       { branch: '', tokens: '', cost: '', effort: '', model: '', thinking: '', pr: '', worktree: '', reset: '' },
}

const BAR = {
  simple:      { full: '━', empty: '─' },
  emoji:       { full: '━', empty: '─' },
  'nerd-font': { full: '━', empty: '─' },
  ascii:       { full: '#', empty: '-' },
}

const SEP = { simple: ' │ ', emoji: ' │ ', 'nerd-font': ' │ ', ascii: ' | ' }

export function makeTheme({ symbols = 'simple', colors = true, icons = true } = {}) {
  const mode = SYMBOLS[symbols] ? symbols : 'simple'
  const bars = BAR[mode]
  const rawSep = SEP[mode]
  return {
    colors,
    icons,
    // Dim the separators when colors are on so the chrome recedes and the
    // identity/value text reads as the foreground (the visual hierarchy the
    // reference status line has). width.js strips SGR, so this is zero-width.
    sep: colors ? `\x1b[${SGR.dim}m${rawSep}\x1b[0m` : rawSep,
    symbol(name) {
      if (!icons) return ''
      return SYMBOLS[mode][name] ?? ''
    },
    // A symbol together with the gap that follows it — the ONE place that decides
    // icon spacing, so no segment re-invents it. Empty (no leading space) when the
    // symbol is absent, so a set with no icon leaves no hole. `tone` colours the
    // symbol only, never the value beside it.
    //
    // The gap comes from the symbol's MEASURED width, not from the set's name. A
    // double-width symbol (every emoji) already occupies a trailing column its
    // artwork doesn't fill, so a space on top double-spaces it from its value;
    // anything single-width (⧗, Nerd Font points) still needs one. Measuring says
    // exactly that, where `mode === 'emoji'` only guesses it — and would jam any
    // single-width symbol later added to the emoji table.
    icon(name, tone) {
      const g = this.symbol(name)
      if (!g) return ''
      return (tone ? this.color(tone, g) : g) + (visibleWidth(g) > 1 ? '' : ' ')
    },
    color(name, str) {
      if (!colors || !SGR[name]) return str
      return `\x1b[${SGR[name]}m${str}\x1b[0m`
    },
    // Identity text sits at the terminal's DEFAULT foreground — no escape at all.
    //
    // This used to be `dim`, on the theory that the default is a glaring white.
    // It isn't: the default foreground is the colour the user picked to read text
    // in, so it is the one value guaranteed legible on their background, dark or
    // light. `dim` then subtracted contrast from it and left the line washed out.
    // It's also the register the reference status line used (ANSI 37, the
    // *normal* white — brighter than dim, softer than bright-white).
    //
    // The rule that replaces the old one: colour marks WHICH FIELD this is, dim
    // is for chrome only, and information is never dimmed.
    primary(str) {
      return str
    },
    // Chrome: separators, a bar's unspent run, and labels that merely *name* a
    // value rather than being one. `dim` is defined relative to the foreground,
    // so it recedes on any background without ever inverting.
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
      // `empty` is '' at 100% — wrapping that would emit a dangling \x1b[2m\x1b[0m.
      return this.color(tone, full) + (empty ? this.color('dim', empty) : '')
    },
  }
}
