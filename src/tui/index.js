// Interactive config panel. The pure pieces (renderPanel, PREVIEW_INPUT) are
// unit-tested; the raw-mode keypress loop is a thin I/O shell around the same
// pure reducer + render(), so the live preview is byte-identical to the real
// status line (the WYSIWYG guarantee).
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '../render.js'
import { initialState, reduce, stateToConfig } from './state.js'
import { refreshIntervalFor, loadConfig } from '../config.js'
import { ccbriefDir } from '../paths.js'

// Fixed dummy data — never real repo/session info. Mirrors test/fixtures.standard
// (src/ must not import from test/, so the shape is duplicated intentionally).
export const PREVIEW_INPUT = {
  now: 0, workspace: { current_dir: '/home/dev/ccbrief', repo: { name: 'ccbrief' } },
  git: { branch: 'main', added: 3, removed: 1 }, model: { display_name: 'Opus' },
  context_window: { used_percentage: 42, remaining_percentage: 58, total_input_tokens: 116_000, total_output_tokens: 12_000, current_usage: { input_tokens: 128_000 } },
  cost: { total_duration_ms: 5_040_000, total_cost_usd: 1.23, total_lines_added: 120, total_lines_removed: 34 },
  effort: { level: 'high' },
}

export function renderPanel(state, ctx = { columns: 80 }) {
  const preview = render(PREVIEW_INPUT, stateToConfig(state), ctx)
  const enabled = state.segments.filter((s) => s.enabled).map((s) => s.id).join(', ')
  return [
    `ccbrief · configuration                 preset: ${state.preset}`,
    `segments: ${enabled}`,
    `glyphs: ${state.glyphs}   colors: ${state.colors ? 'on' : 'off'}   icons: ${state.icons ? 'on' : 'off'}   layout: ${state.layout}`,
    `Preview ${'─'.repeat(Math.max(0, ctx.columns - 8))}`,
    ` ${preview}`,
    '─'.repeat(ctx.columns),
    '[space] toggle  [↑↓] move cursor  [</>] reorder  [p] preset  [g] glyphs  [c] colors  [i] icons  [l] layout  [s] save  [q] quit',
  ].join('\n')
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
    const marks = state.segments
      .map((s, i) => `${i === cursor ? '▸' : ' '} ${s.enabled ? '[x]' : '[ ]'} ${s.id}`)
      .join('\n')
    process.stdout.write('\x1b[2J\x1b[H' + renderPanel(state, { columns }) + '\n\n' + marks + '\n')
  }
  paint()

  if (!process.stdin.isTTY) return // non-interactive (piped/CI) → paint once, don't hang
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  return new Promise((resolve) => {
    const done = () => { process.stdin.setRawMode(false); process.stdin.pause(); resolve() }
    process.stdin.on('data', (key) => {
      const id = state.segments[cursor]?.id
      switch (key) {
        case 'q': case '\x03': return done()                                   // q / Ctrl-C
        case 's': saveConfig(state, dir); return done()
        case '\x1b[A': cursor = Math.max(0, cursor - 1); break                 // ↑
        case '\x1b[B': cursor = Math.min(state.segments.length - 1, cursor + 1); break // ↓
        case ' ': if (id) state = reduce(state, { type: 'toggle', id }); break // toggle
        case '<': if (id && cursor > 0) { state = reduce(state, { type: 'move', id, dir: -1 }); cursor-- } break
        case '>': if (id && cursor < state.segments.length - 1) { state = reduce(state, { type: 'move', id, dir: 1 }); cursor++ } break
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
