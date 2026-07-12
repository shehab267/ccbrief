// Interactive config panel. The pure pieces (renderPanel, PREVIEW_INPUT) are
// unit-tested; the raw-mode keypress loop is a thin I/O shell around the same
// pure reducer + render(), so the live preview is byte-identical to the real
// status line (the WYSIWYG guarantee).
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '../render.js'
import { initialState, reduce, stateToConfig, configToFile } from './state.js'
import { refreshIntervalFor, loadConfig } from '../config.js'
import { optionsFor, BY_ID } from '../segments/index.js'
import { ccbriefDir } from '../paths.js'

// The preview session is shared with `init` (src/preview.js) so both previews and
// the real status line always agree. Re-exported: the TUI is where it's consumed.
export { PREVIEW_INPUT } from '../preview.js'
import { PREVIEW_INPUT } from '../preview.js'

// Each symbol set's portability, surfaced live in the panel so the choice is
// informed. `nerd-font` renders blank without a Nerd Font installed — the exact
// trap that silently wiped a user's icons — so it says so. The live preview is
// the proof; this label is the warning that makes a blank preview make sense.
const SYMBOL_NOTES = {
  simple: 'same on every terminal',
  emoji: 'most terminals; look varies',
  'nerd-font': 'needs a Nerd Font installed',
  ascii: 'plain text, works everywhere',
}

export function renderPanel(state, ctx = { columns: 80 }) {
  const preview = render(PREVIEW_INPUT, stateToConfig(state), ctx)
  // No `segments: directory, repo, fiveHour, …` summary line here. It said nothing the
  // titled, checkboxed rows below don't say better, and it was the last place in the
  // picker where a raw config key stood alone with no plain word beside it.
  //
  // The keymap stays global and static. The per-window time/percent toggles are not
  // listed here — they get a dedicated plain-language tip (optionHint) shown only
  // while a limit row is focused, which reads as guidance instead of one more
  // cryptic key token crammed into this line.
  const on = state.segments.filter((s) => s.enabled).length
  const rule = (label) => `${label} ${'─'.repeat(Math.max(0, ctx.columns - label.length - 1))}`
  return [
    `ccbrief · configuration                 preset: ${state.preset}`,
    `symbols: ${state.symbols} (${SYMBOL_NOTES[state.symbols] ?? ''})   colors: ${state.colors ? 'on' : 'off'}   icons: ${state.icons ? 'on' : 'off'}   layout: ${state.layout}`,
    // Two keymap lines, because one ran to 108 columns and wrapped on any terminal
    // narrower than that — a keymap that wraps is a keymap you read twice.
    `[space] show/hide   [↑↓] move   [←→] reorder   [↵] save   [esc] quit`,
    `[p] preset  [y] symbols  [c] colors  [i] icons  [l] layout`,
    rule('Preview'),
    ` ${preview}`,
    // The count heads the list, and it is the line that says the list below is the
    // WHOLE catalog — that the unticked rows are an offer, not leftovers.
    rule(`Segments — ${on} of ${state.segments.length} shown`),
  ].join('\n')
}

// The segment list with the cursor. Every row carries BOTH its id and its plain-word
// title: the id is what you'd type into config.json, the title is what the segment
// actually is — `fiveHour` tells you nothing you didn't already have to know.
//
// A segment with declared toggles (repo → diff; the rate-limit windows → time /
// percent) shows each part's visibility as a filled/empty dot — ● shown, ○ hidden —
// and nothing else, so a row you aren't editing stays quiet. The keys that flip them
// live in a separate one-line tip (optionHint), because gluing `[t]`/`[%]`/`[d]` onto
// the dots read as clutter, not as guidance. Fixed-width columns keep ids, titles and
// dots aligned down the list; trailing padding is trimmed so a row without dots ends
// where its title does. Pure (paint() is the only caller) so the markup is testable.
export function renderMarks(state, cursor) {
  const dot = (on) => (on ? '●' : '○')
  return state.segments
    .map((s, i) => {
      const opts = optionsFor(s.id)
      const dots = opts.map((o) => `${o.label} ${dot(s[o.key] ?? o.default)}`).join('  ')
      const title = BY_ID[s.id]?.title ?? ''
      const head = `${i === cursor ? '▸' : ' '} ${s.enabled ? '[x]' : '[ ]'} `
      return (head + s.id.padEnd(12) + title.padEnd(21) + dots).trimEnd()
    })
    .join('\n')
}

// A single, plain-language tip shown only while an option-bearing row is focused,
// so the user learns its parts can be shown/hidden and which key does which. Built
// from the same registry, so a segment's tip always matches its dots and keys. One
// short line — it's guidance, not a token to be decoded. '' on any other row.
export function optionHint(focusedId) {
  const opts = optionsFor(focusedId)
  if (!opts.length) return ''
  const parts = opts.map((o) => `[${o.ch}] ${o.label}`).join(' · ')
  return `tip: ${parts} — show/hide`
}

export function saveConfig(state, dir = ccbriefDir()) {
  const config = stateToConfig(state)
  mkdirSync(dir, { recursive: true })
  // configToFile trims the segment list under a named preset (see state.js) — the
  // file stays honest about what it actually reads. The FULL config is what we
  // return, because the caller re-syncs settings.json from it.
  writeFileSync(join(dir, 'config.json'), JSON.stringify(configToFile(config), null, 2) + '\n')
  return { config, refreshInterval: refreshIntervalFor(config) }
}

const PRESET_CYCLE = ['standard', 'detailed', 'custom']
const SYMBOL_CYCLE = ['simple', 'emoji', 'nerd-font', 'ascii']
const LAYOUT_CYCLE = ['auto', 'single-line', 'multi-line']
const next = (cycle, cur) => cycle[(cycle.indexOf(cur) + 1) % cycle.length]

// The I/O shell: raw-mode keypresses → reduce → repaint. `input`/`output` are seams
// so the key loop is testable with a fake TTY (see test/tui-keys.test.js).
//
// Resolves with the saved config, or undefined when the user quits without saving —
// that return value is how the caller knows whether to re-sync settings.json.
export async function runConfigTui({ dir = ccbriefDir(), initialConfig, input = process.stdin, output = process.stdout } = {}) {
  let state = initialState(loadConfig(initialConfig ?? {}))
  let cursor = 0
  const columns = Number(process.env.COLUMNS) || 80

  // The panel's last line is the `Segments —` rule, so the list follows it directly:
  // one blank line there would push the whole screen past 24 rows, and the rule
  // already does the separating.
  const paint = () => {
    const hint = optionHint(state.segments[cursor]?.id)
    const body = renderPanel(state, { columns }) + '\n' + renderMarks(state, cursor) + (hint ? `\n\n  ${hint}` : '')
    output.write('\x1b[2J\x1b[H' + body + '\n')
  }
  paint()

  if (!input.isTTY) return // non-interactive (piped/CI) → paint once, don't hang
  input.setRawMode(true)
  input.resume()
  input.setEncoding('utf8')

  return new Promise((resolve) => {
    // Clear on the way out so the caller's "saved" / "nothing saved" line lands on a
    // clean screen instead of being buried under the last painted frame — which is
    // what made saving and quitting look identical.
    const done = (config) => {
      input.setRawMode(false)
      input.pause()
      output.write('\x1b[2J\x1b[H')
      resolve(config)
    }
    input.on('data', (key) => {
      const seg = state.segments[cursor]
      const id = seg?.id
      // Per-segment show/hide toggles are data-driven: press a part's letter to
      // flip it. Runs before the global keymap; a part's `ch` only acts on a row
      // that declares it (none currently collide with a global command key).
      const opt = id && optionsFor(id).find((o) => o.ch === key)
      if (opt) { state = reduce(state, { type: 'setOption', id, key: opt.key, value: !(seg[opt.key] ?? opt.default) }); paint(); return }
      switch (key) {
        // Esc quits, like q — it's the key people reach for to back out. Esc is also the
        // first byte of every arrow sequence, but raw mode delivers an arrow as a single
        // '\x1b[A' chunk, so a lone '\x1b' really is the Esc key and not a stray prefix.
        case 'q': case '\x1b': case '\x03': return done()                          // q / Esc / Ctrl-C
        case 's': case '\r': case '\n': return done(saveConfig(state, dir).config) // s or Enter (CR / LF)
        case '\x1b[A': cursor = Math.max(0, cursor - 1); break                 // ↑
        case '\x1b[B': cursor = Math.min(state.segments.length - 1, cursor + 1); break // ↓
        case ' ': if (id) state = reduce(state, { type: 'toggle', id }); break // toggle
        case '\x1b[D': if (id && cursor > 0) { state = reduce(state, { type: 'move', id, dir: -1 }); cursor-- } break // ← reorder earlier
        case '\x1b[C': if (id && cursor < state.segments.length - 1) { state = reduce(state, { type: 'move', id, dir: 1 }); cursor++ } break // → reorder later
        case 'p': state = reduce(state, { type: 'preset', preset: next(PRESET_CYCLE, state.preset) }); cursor = 0; break
        // `y` because the setting is `symbols` and `s` is taken by save. `g` is the
        // key this used to be (back when it was called "glyphs") — still accepted, so
        // muscle memory keeps working, but no longer advertised in the keymap.
        case 'y': case 'g': state = reduce(state, { type: 'set', key: 'symbols', value: next(SYMBOL_CYCLE, state.symbols) }); break
        case 'c': state = reduce(state, { type: 'set', key: 'colors', value: !state.colors }); break
        case 'i': state = reduce(state, { type: 'set', key: 'icons', value: !state.icons }); break
        case 'l': state = reduce(state, { type: 'set', key: 'layout', value: next(LAYOUT_CYCLE, state.layout) }); break
        default: return // ignore unknown keys without repainting
      }
      paint()
    })
  })
}
