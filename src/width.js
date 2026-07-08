// Visible-width measurement for the layout engine — the single source of width
// truth for both the renderer and the TUI preview.
//
// Wraps bundled `string-width` (esbuild-inlined into the renderer → zero runtime
// deps). With its default options, string-width already does everything the
// layout engine needs:
//   • strips ANSI SGR color codes (countAnsiEscapeCodes defaults to false) → 0 cols
//   • strips OSC 8 hyperlink wrappers (via its internal strip-ansi) → only the
//     visible link text is counted
//   • counts emoji / CJK / ZWJ / VS16 graphemes as 2 columns
// Verified empirically against string-width@7.2.0 (see test/width.test.js), so no
// hand-rolled escape stripping is needed here — a manual SGR/OSC8 regex would be
// redundant. The test suite pins these widths for the exact glyphs and wrappers
// the renderer emits (our usage, not the library's internals).
import stringWidth from 'string-width'

/** Visible column width of a string; ANSI SGR + OSC 8 wrappers count as 0. */
export function visibleWidth(str) {
  return stringWidth(String(str))
}
