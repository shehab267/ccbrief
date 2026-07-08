// ANSI colors + glyph tables. `ascii` mode is the guaranteed-safe fallback —
// emoji and Nerd Font glyph widths vary across terminals, so ascii is always kept.

const SGR = { dim: 2, red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36 }

const GLYPHS = {
  emoji:       { branch: '🌿', duration: '⏱', cost: '💰', effort: '⚡', thinking: '🧠', pr: '🔎', worktree: '🌲' },
  'nerd-font': { branch: '', duration: '', cost: '', effort: '', thinking: '', pr: '', worktree: '' },
  ascii:       { branch: '', duration: '', cost: '', effort: '', thinking: '', pr: '', worktree: '' },
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
  return {
    colors,
    icons,
    sep: SEP[mode],
    glyph(name) {
      if (!icons) return ''
      return GLYPHS[mode][name] ?? ''
    },
    color(name, str) {
      if (!colors || !SGR[name]) return str
      return `\x1b[${SGR[name]}m${str}\x1b[0m`
    },
    bar(pct, width = 9) {
      const clamped = Math.max(0, Math.min(100, Number(pct) || 0))
      const filled = Math.round((clamped / 100) * width)
      return bars.full.repeat(filled) + bars.empty.repeat(width - filled)
    },
  }
}
