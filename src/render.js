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
  for (const { id, enabled } of config.segments ?? []) {
    if (!enabled) continue
    const seg = BY_ID[id]
    if (!seg || !seg.isAvailable(input)) continue
    const text = seg.format(input, theme)
    if (text) parts.push(text) // '' from a segment is treated as hidden
  }
  const columns = ctx.columns ?? 80
  return layout(parts, { columns, maxRows: config.maxRows ?? 3, mode: config.layout ?? 'auto', sep: theme.sep })
}
