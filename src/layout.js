// Row-packing engine. Measures with the bundled string-width (via width.js) and
// packs COMPLETE segments into ≤ maxRows rows against COLUMNS − margin. It never
// relies on terminal wrapping and never splits a segment; a single oversized
// segment is truncated with an ellipsis instead of overflowing.
import { visibleWidth } from './width.js'

const ELLIPSIS = '…'

// A cut lands wherever the columns run out — which, now that every segment is
// colour-wrapped, is routinely INSIDE an escape-delimited run. Escapes are
// zero-width, so the loop below happily copies the opening `\x1b[36m` and then
// breaks on the first visible char that overflows, never reaching the closing
// `\x1b[0m`. An unterminated SGR does not stop at the status line: the terminal
// stays cyan for everything printed afterwards. Same for an OSC 8 hyperlink whose
// `\x1b]8;;\x07` terminator gets cut — the rest of the screen becomes a link.
//
// So: re-close whatever the cut left open. RESET after the ellipsis clears any
// dangling SGR, and the OSC 8 terminator is re-emitted only when the truncated
// text opened a hyperlink it didn't close. Both are zero-width, so they cost the
// layout nothing.
const RESET = '\x1b[0m'
const OSC8_END = '\x1b]8;;\x07'
// An escape is ATOMIC: an OSC 8 hyperlink (`\x1b]8;;URL` + BEL or ST) or an SGR
// colour code. Matched sticky so we can step over one without slicing the string.
const ESC = /\x1b\]8;;[^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-9;]*m/y
const SGR_G = /\x1b\[[0-9;]*m/g
const OSC8_G = /\x1b\]8;;[^\x07\x1b]*(?:\x07|\x1b\\)/g

// Re-close whatever the cut left open. Both additions are zero-width, so they
// cost the layout nothing.
function reclose(out) {
  let tail = ''
  // A hyperlink is opened by `\x1b]8;;URL\x07` and closed by an empty one, so an
  // odd count means the cut fell inside the link TEXT and the link is still open.
  if (((out.match(OSC8_G) ?? []).length % 2) === 1) tail += OSC8_END
  // Any SGR whose last code isn't a reset leaves colour switched on.
  const codes = out.match(SGR_G) ?? []
  if (codes.length && codes[codes.length - 1] !== RESET) tail += RESET
  return tail
}

// Truncation walks TOKENS, not characters.
//
// The old loop stepped one code point at a time, which meant a cut could land in
// the middle of an escape sequence — and that does not stay inside the status
// line. A half-written `\x1b]8;;https://git…` is an OSC with no terminator, so the
// terminal keeps swallowing whatever is printed next as part of the sequence; a
// dangling `\x1b[36m` with no `\x1b[0m` leaves the rest of the screen cyan. Every
// segment is colour-wrapped now, so this is reachable, not theoretical.
//
// So: escapes are atomic (copied whole, zero width, never split), only visible
// graphemes are measured against the budget, and anything still open at the cut is
// closed. Segmenter keeps a ZWJ emoji from being severed into its components.
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

function truncateToWidth(str, max) {
  if (visibleWidth(str) <= max) return str
  const budget = max - 1 // reserve a column for the ellipsis
  let out = ''
  let width = 0
  let i = 0
  while (i < str.length) {
    ESC.lastIndex = i
    const esc = ESC.exec(str)
    if (esc) {
      out += esc[0] // zero-width: always fits, never split
      i = ESC.lastIndex
      continue
    }
    // Next visible grapheme: measure it whole, and stop before overflowing.
    const rest = str.slice(i)
    const g = graphemes.segment(rest)[Symbol.iterator]().next().value.segment
    const w = visibleWidth(g)
    if (width + w > budget) break
    out += g
    width += w
    i += g.length
  }
  return out + ELLIPSIS + reclose(out)
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
