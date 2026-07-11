// Interactive config panel. The pure pieces (renderPanel, PREVIEW_INPUT) are
// unit-tested; the raw-mode keypress loop is a thin I/O shell around the same
// pure reducer + render(), so the live preview is byte-identical to the real
// status line (the WYSIWYG guarantee).
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '../render.js'
import { initialState, reduce, stateToConfig } from './state.js'
import { refreshIntervalFor, loadConfig } from '../config.js'
import { optionsFor } from '../segments/index.js'
import { ccbriefDir } from '../paths.js'

// Fixed dummy data — never real repo/session info. Mirrors test/fixtures.standard
// (src/ must not import from test/, so the shape is duplicated intentionally).
export const PREVIEW_INPUT = {
  now: 0, workspace: { current_dir: '/home/dev/ccbrief', repo: { name: 'ccbrief' } },
  git: { branch: 'main', added: 3, removed: 1 }, model: { display_name: 'Opus' },
  context_window: { used_percentage: 42, remaining_percentage: 58, total_input_tokens: 116_000, total_output_tokens: 12_000, current_usage: { input_tokens: 128_000 } },
  cost: { total_duration_ms: 5_040_000, total_cost_usd: 1.23, total_lines_added: 120, total_lines_removed: 34 },
  effort: { level: 'high' },
  // resets_at is Unix epoch SECONDS; PREVIEW_INPUT.now is 0, so these are the
  // seconds-until-reset directly. Present so the preview shows the rate-limit
  // windows (standard now leads with fiveHour; detailed adds weekly).
  rate_limits: {
    five_hour: { used_percentage: 40, resets_at: 2 * 3600 },            // 2h out
    seven_day: { used_percentage: 62, resets_at: (3 * 24 + 4) * 3600 }, // ~3d 4h out
  },
}

export function renderPanel(state, ctx = { columns: 80 }) {
  const preview = render(PREVIEW_INPUT, stateToConfig(state), ctx)
  const enabled = state.segments.filter((s) => s.enabled).map((s) => s.id).join(', ')
  // The keymap stays global and static. The per-window time/pct toggles are not
  // listed here — they get a dedicated plain-language tip (limitHint) shown only
  // while a limit row is focused, which reads as guidance instead of one more
  // cryptic key token crammed into this line.
  return [
    `ccbrief · configuration                 preset: ${state.preset}`,
    `segments: ${enabled}`,
    `glyphs: ${state.glyphs}   colors: ${state.colors ? 'on' : 'off'}   icons: ${state.icons ? 'on' : 'off'}   layout: ${state.layout}`,
    `Preview ${'─'.repeat(Math.max(0, ctx.columns - 8))}`,
    ` ${preview}`,
    '─'.repeat(ctx.columns),
    `[space] toggle  [↑↓] move  [←→] reorder  [p] preset  [g] glyphs  [c] colors  [i] icons  [l] layout  [↵/s] save  [q] quit`,
  ].join('\n')
}

// The segment list with the cursor. A segment with declared toggles (repo →
// diff; the rate-limit windows → time / pct) shows each part's visibility as a
// filled/empty dot — ● shown, ○ hidden — and nothing else, so a row you aren't
// editing stays quiet. The keys that flip them live in a separate one-line tip
// (optionHint), because gluing `[t]`/`[%]`/`[d]` onto the dots read as clutter,
// not as guidance. Pure (paint() is the only caller) so the markup is testable.
export function renderMarks(state, cursor) {
  const dot = (on) => (on ? '●' : '○')
  return state.segments
    .map((s, i) => {
      const opts = optionsFor(s.id)
      const dots = opts.map((o) => `${o.label} ${dot(s[o.key] ?? o.default)}`).join('  ')
      const opt = opts.length ? `  ${dots}` : ''
      const id = opts.length ? s.id.padEnd(9) : s.id
      return `${i === cursor ? '▸' : ' '} ${s.enabled ? '[x]' : '[ ]'} ${id}${opt}`
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
  const parts = opts.map((o) => `[${o.ch}] ${o.long ?? o.label}`).join(' · ')
  return `tip: ${parts} — show/hide`
}

export function saveConfig(state, dir = ccbriefDir()) {
  const config = stateToConfig(state)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2) + '\n')
  return { config, refreshInterval: refreshIntervalFor(config) }
}

const PRESET_CYCLE = ['minimal', 'standard', 'detailed', 'custom']
const GLYPH_CYCLE = ['emoji', 'nerd-font', 'ascii']
const LAYOUT_CYCLE = ['auto', 'single-line', 'multi-line']
const next = (cycle, cur) => cycle[(cycle.indexOf(cur) + 1) % cycle.length]

// Thin I/O shell (not unit-tested): raw-mode keypresses → reduce → repaint.
export async function runConfigTui({ dir = ccbriefDir(), initialConfig } = {}) {
  let state = initialState(loadConfig(initialConfig ?? {}))
  let cursor = 0
  const columns = Number(process.env.COLUMNS) || 80

  const paint = () => {
    const hint = optionHint(state.segments[cursor]?.id)
    const body = renderPanel(state, { columns }) + '\n\n' + renderMarks(state, cursor) + (hint ? `\n\n  ${hint}` : '')
    process.stdout.write('\x1b[2J\x1b[H' + body + '\n')
  }
  paint()

  if (!process.stdin.isTTY) return // non-interactive (piped/CI) → paint once, don't hang
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  return new Promise((resolve) => {
    const done = () => { process.stdin.setRawMode(false); process.stdin.pause(); resolve() }
    process.stdin.on('data', (key) => {
      const seg = state.segments[cursor]
      const id = seg?.id
      // Per-segment show/hide toggles are data-driven: press a part's letter to
      // flip it. Runs before the global keymap; a part's `ch` only acts on a row
      // that declares it (none currently collide with a global command key).
      const opt = id && optionsFor(id).find((o) => o.ch === key)
      if (opt) { state = reduce(state, { type: 'setOption', id, key: opt.key, value: !(seg[opt.key] ?? opt.default) }); paint(); return }
      switch (key) {
        case 'q': case '\x03': return done()                                   // q / Ctrl-C
        case 's': case '\r': case '\n': saveConfig(state, dir); return done()  // s or Enter (CR / LF)
        case '\x1b[A': cursor = Math.max(0, cursor - 1); break                 // ↑
        case '\x1b[B': cursor = Math.min(state.segments.length - 1, cursor + 1); break // ↓
        case ' ': if (id) state = reduce(state, { type: 'toggle', id }); break // toggle
        case '\x1b[D': if (id && cursor > 0) { state = reduce(state, { type: 'move', id, dir: -1 }); cursor-- } break // ← reorder earlier
        case '\x1b[C': if (id && cursor < state.segments.length - 1) { state = reduce(state, { type: 'move', id, dir: 1 }); cursor++ } break // → reorder later
        case 'p': state = reduce(state, { type: 'preset', preset: next(PRESET_CYCLE, state.preset) }); cursor = 0; break
        case 'g': state = reduce(state, { type: 'set', key: 'glyphs', value: next(GLYPH_CYCLE, state.glyphs) }); break
        case 'c': state = reduce(state, { type: 'set', key: 'colors', value: !state.colors }); break
        case 'i': state = reduce(state, { type: 'set', key: 'icons', value: !state.icons }); break
        case 'l': state = reduce(state, { type: 'set', key: 'layout', value: next(LAYOUT_CYCLE, state.layout) }); break
        default: return // ignore unknown keys without repainting
      }
      paint()
    })
  })
}
