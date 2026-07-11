// ANSI colors + glyph tables. `ascii` mode is the guaranteed-safe fallback —
// emoji and Nerd Font glyph widths vary across terminals, so ascii is always kept.

// Accents use the BRIGHT ANSI set (90s), not the standard set (30s): the
// standard codes render muddy/dark on dark themes, which is exactly the
// "too dark to read" complaint. `orange` is 256-color — there is no orange in
// the 16-color set — which is safe here because the renderer already assumes a
// capable terminal (emoji, Nerd Fonts, OSC 8 links). The reset countdown warms
// to `orange` as it approaches but never to red: an imminent reset is relief,
// not danger, so the alarm colours have no caller and are deliberately absent.
//
// There is deliberately no foreground colour for ordinary text. Colour is
// reserved for values that carry state; everything else takes one of the three
// tiers below.
const SGR = {
  dim: 2, bold: 1,
  red: 91, green: 92, yellow: 93, blue: 94, magenta: 95, cyan: 96,
  orange: '38;5;208',
}

// `model` gets 🧠 and `thinking` the thought balloon: thinking.enabled is a
// near-always-true boolean on current models, so the brain reads better on the
// segment that actually names which model you're talking to. `reset` is a
// monochrome sand-timer (⧗, not the ⏳ emoji) precisely so it can take the
// urgency color that the reset-countdown segment paints it with. `lines` gets a
// pencil so its session-edit +/- diff can't be mistaken for the repo segment's
// identical-looking working-tree +/- diff sitting next to it.
const GLYPHS = {
  emoji:       { branch: '🌿', duration: '⏱', cost: '💰', effort: '⚡', model: '🧠', thinking: '💭', pr: '🔎', worktree: '🌲', reset: '⧗', lines: '✎' },
  'nerd-font': { branch: '', duration: '', cost: '', effort: '', model: '', thinking: '', pr: '', worktree: '', reset: '⧗', lines: '✎' },
  ascii:       { branch: '', duration: '', cost: '', effort: '', model: '', thinking: '', pr: '', worktree: '', reset: '', lines: '' },
}

const BAR = {
  emoji:       { full: '━', empty: '─' },
  'nerd-font': { full: '━', empty: '─' },
  ascii:       { full: '#', empty: '-' },
}

const SEP = { emoji: ' │ ', 'nerd-font': ' │ ', ascii: ' | ' }

export function makeTheme({ glyphs = 'emoji', colors = true, icons = true } = {}) {
  const mode = GLYPHS[glyphs] ? glyphs : 'emoji'
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
