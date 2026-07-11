// Registry of every per-segment show/hide toggle. Each option-bearing segment
// maps to an array of its toggleable parts:
//   key     — the boolean field on the segment's config entry (also the state key)
//   ch      — the letter that flips it in the config TUI
//   label   — short name shown as a dot in the TUI marks (e.g. `time ●`)
//   long    — friendlier word used in the TUI tip line (defaults to `label`)
//   default — visibility when the entry omits the key
// This one table drives segment-format defaulting, config `withOptions`, and the
// whole TUI (dots, tip, keybindings), so a new toggle is a single entry with no
// per-segment branching anywhere. Kept dependency-free so both the segment layer
// and the config/TUI layer can import it without an import cycle.
export const SEGMENT_OPTIONS = {
  // The repo segment's `+N/-M` is the git working-tree diff vs HEAD. Hidden by
  // default — the branch reads cleaner alone, and the `lines` segment already
  // carries a running +/- — so flip showDiff on to bring it back.
  repo: [{ key: 'showDiff', ch: 'd', label: 'diff', default: false }],
  // Rate-limit windows render a reset countdown and a used-% independently.
  // Session (fiveHour) defaults to time-only — the 5-hour countdown is the number
  // checked most and the line stays compact; its percent is one keystroke away.
  // Weekly shows both, since a multi-day countdown alone says little about how
  // much quota is left.
  fiveHour: [
    { key: 'showTime', ch: 't', label: 'time', default: true },
    { key: 'showPercent', ch: '%', label: 'pct', long: 'percent', default: false },
  ],
  weekly: [
    { key: 'showTime', ch: 't', label: 'time', default: true },
    { key: 'showPercent', ch: '%', label: 'pct', long: 'percent', default: true },
  ],
}

// The toggleable parts declared for a segment id (empty array if it has none).
export const optionsFor = (id) => SEGMENT_OPTIONS[id] ?? []

// { key: default } for a segment id — the shape the format functions and config
// defaulting want when they only need "the default visibility of each part".
export const optionDefaults = (id) =>
  Object.fromEntries(optionsFor(id).map((o) => [o.key, o.default]))
