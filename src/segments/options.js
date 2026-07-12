// Registry of every per-segment show/hide toggle. Each option-bearing segment
// maps to an array of its toggleable parts:
//   key     — the boolean field on the segment's config entry (also the state key)
//   ch      — the letter that flips it in the config picker
//   label   — the part's name, shown as a dot in the picker (e.g. `percent ●`) and
//             in its tip. A WHOLE WORD, never an abbreviation: `pct` reads as noise
//             to anyone who doesn't already know the tool, and the two columns it
//             saves buy nothing — the picker is not the status line.
//   default — visibility when the entry omits the key
// This one table drives segment-format defaulting, config `withOptions`, and the
// whole picker (dots, tip, keybindings), so a new toggle is a single entry with no
// per-segment branching anywhere. Kept dependency-free so both the segment layer
// and the config/picker layer can import it without an import cycle.
export const SEGMENT_OPTIONS = {
  // The repo segment's `+N/-M` is the git working-tree diff vs HEAD. Hidden by
  // default — the branch reads cleaner alone, and the `lines` segment already
  // carries a running +/- — so flip showDiff on to bring it back.
  repo: [{ key: 'showDiff', ch: 'd', label: 'diff', default: false }],
  // Rate-limit windows render a reset countdown and a used-% independently. BOTH
  // windows now default to both parts: the countdown says when relief arrives, the
  // percent says whether you need it, and one without the other is half an answer.
  // (Session used to ship time-only to keep the line compact — but a limit segment
  // that never warns you is decoration, and two columns is a cheap price.)
  fiveHour: [
    { key: 'showTime', ch: 't', label: 'time', default: true },
    { key: 'showPercent', ch: '%', label: 'percent', default: true },
  ],
  weekly: [
    { key: 'showTime', ch: 't', label: 'time', default: true },
    { key: 'showPercent', ch: '%', label: 'percent', default: true },
  ],
}

// The toggleable parts declared for a segment id (empty array if it has none).
export const optionsFor = (id) => SEGMENT_OPTIONS[id] ?? []

// { key: default } for a segment id — the shape the format functions and config
// defaulting want when they only need "the default visibility of each part".
export const optionDefaults = (id) =>
  Object.fromEntries(optionsFor(id).map((o) => [o.key, o.default]))
