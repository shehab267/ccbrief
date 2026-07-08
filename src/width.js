// Visible-width measurement for the layout engine.
// Wraps `string-width` (bundled into the renderer at build time). Emoji and
// wide (CJK) glyphs count as 2 columns; ANSI SGR sequences count as 0.
import stringWidth from 'string-width'

const ANSI_SGR = /\x1b\[[0-9;]*m/g

/** Visible column width of a string, ignoring ANSI color codes. */
export function visibleWidth(str) {
  return stringWidth(String(str).replace(ANSI_SGR, ''))
}
