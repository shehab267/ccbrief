// PURE render core — the single source of truth for both the real status line
// and the TUI live preview. It performs no I/O: the caller collects data
// (stdin, git, config, COLUMNS) and passes it in.
//
// Task 11 replaces the `parts.join(theme.sep)` below with the COLUMNS-aware
// layout engine; the segment-assembly loop stays.
import { BY_ID } from './segments/index.js'
import { makeTheme } from './theme.js'

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
  // Task 11: swap this join for layout(parts, { columns, maxRows, mode, sep }).
  return parts.join(theme.sep)
}
