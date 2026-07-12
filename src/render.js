// PURE render core — the single source of truth for both the real status line
// and the TUI live preview. It performs no I/O: the caller collects data
// (stdin, git, config, COLUMNS) and passes it in.
//
import { BY_ID } from './segments/index.js'
import { makeTheme } from './theme.js'
import { layout } from './layout.js'

export function render(input, config, ctx = {}) {
  const theme = makeTheme(config)
  const parts = []
  for (const entry of config.segments ?? []) {
    if (!entry.enabled) continue
    const seg = BY_ID[entry.id]
    if (!seg || !seg.isAvailable(input)) continue
    // The whole entry is passed so option-bearing segments (the rate-limit
    // windows read showTime/showPercent) can self-configure; every other
    // segment ignores the third argument, so nothing else changes.
    const text = seg.format(input, theme, entry)
    if (text) parts.push(text) // '' from a segment is treated as hidden
  }
  const columns = ctx.columns ?? 80
  return layout(parts, { columns, maxRows: config.maxRows ?? 3, mode: config.layout ?? 'auto', sep: theme.sep })
}
