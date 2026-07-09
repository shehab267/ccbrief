// Row-packing engine. Measures with the bundled string-width (via width.js) and
// packs COMPLETE segments into ≤ maxRows rows against COLUMNS − margin. It never
// relies on terminal wrapping and never splits a segment; a single oversized
// segment is truncated with an ellipsis instead of overflowing.
import { visibleWidth } from './width.js'

const ELLIPSIS = '…'

function truncateToWidth(str, max) {
  if (visibleWidth(str) <= max) return str
  let out = ''
  for (const ch of str) {
    if (visibleWidth(out + ch) > max - 1) break // reserve 1 col for the ellipsis
    out += ch
  }
  return out + ELLIPSIS
}

// First-fit: minimize rows, preserve order, ≤ maxRows, drop trailing overflow.
function packFirstFit(parts, sepW, max, maxRows) {
  const rows = [[]]
  const widths = [0]
  for (const part of parts) {
    const pw = visibleWidth(part)
    const r = rows.length - 1
    if (widths[r] === 0) {
      rows[r].push(pw > max ? truncateToWidth(part, max) : part)
      widths[r] = Math.min(pw, max)
    } else if (widths[r] + sepW + pw <= max) {
      rows[r].push(part)
      widths[r] += sepW + pw
    } else if (rows.length < maxRows) {
      rows.push([pw > max ? truncateToWidth(part, max) : part])
      widths.push(Math.min(pw, max))
    } else {
      break // out of rows → drop this and the rest
    }
  }
  return rows
}

// Balanced: distribute across min(maxRows, n) rows as evenly as possible.
function packBalanced(parts, sep, sepW, max, maxRows) {
  const n = parts.length
  const T = Math.min(maxRows, Math.max(1, n))
  const base = Math.floor(n / T)
  const extra = n % T
  const targets = Array.from({ length: T }, (_, i) => base + (i < extra ? 1 : 0))
  const rows = []
  let i = 0
  for (let r = 0; r < T && i < n; r++) {
    const row = []
    let w = 0
    let count = 0
    while (i < n && (count < targets[r] || r === T - 1)) {
      const part = parts[i]
      const pw = visibleWidth(part)
      if (w === 0) {
        row.push(pw > max ? truncateToWidth(part, max) : part)
        w = Math.min(pw, max)
        i++; count++
      } else if (w + sepW + pw <= max) {
        row.push(part); w += sepW + pw; i++; count++
      } else break
    }
    rows.push(row)
  }
  return rows // any leftover (i < n) is dropped
}

export function layout(parts, { columns = 80, maxRows = 3, mode = 'auto', sep = ' │ ', margin = 1 } = {}) {
  const list = (parts ?? []).filter((p) => p && p.length)
  if (list.length === 0) return ''
  const max = Math.max(1, columns - margin)
  const sepW = visibleWidth(sep)
  let rows
  if (mode === 'single-line') rows = packFirstFit(list, sepW, max, 1)
  else if (mode === 'multi-line') rows = packBalanced(list, sep, sepW, max, maxRows)
  else rows = packFirstFit(list, sepW, max, maxRows)
  return rows.map((r) => r.join(sep)).join('\n')
}
