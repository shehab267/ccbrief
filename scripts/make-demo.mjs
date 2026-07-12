// Generates the images in `assets/` from the REAL renderer.
//
// The pictures in the README are the thing most people judge ccbrief on, so they
// are not hand-drawn mockups: this script feeds the `demo` fixture through
// `render()` and translates the ANSI escapes it emits into HTML, one span per
// colour run. What you see published is exactly what the status line prints.
//
// Why two panes: ccbrief's accents are ANSI *palette slots*, not pinned RGB, so
// the same line is legible on a dark and a light terminal (see theme.js). That
// claim is invisible in a single screenshot, so we resolve the slots against two
// real terminal palettes and show both. The panes ARE the proof.
//
// Usage: npm run demo  →  writes assets/*.html, then screenshot them to PNG.
import { writeFileSync, mkdirSync } from 'node:fs'
import { render } from '../src/render.js'
import { loadConfig } from '../src/config.js'
import { visibleWidth } from '../src/width.js'
import { demo } from '../test/fixtures.js'

// JetBrains Mono advances exactly 0.6em per cell. Rather than hand-pick a font
// size that happens to fit today, size the type to the line we actually rendered
// — measured with the SAME width module the layout engine uses, so a wide glyph
// counts as two columns here exactly as it does on screen. Add a segment and the
// picture shrinks to fit instead of quietly clipping the model off the end.
const fitSize = (line, availablePx, max) =>
  Math.min(max, Math.floor(availablePx / (visibleWidth(line) * 0.6)))

// Two real terminal palettes. The values are each theme's own ANSI slots — we
// don't get to pick prettier ones, because the point is that the user's theme
// picks them and ccbrief stays readable either way. (Note the light theme's
// yellow resolves to a dark amber: that is exactly the adaptation we're showing.)
const THEMES = {
  dark: {
    label: 'dark terminal',
    bg: '#282c34', fg: '#abb2bf',
    red: '#e06c75', green: '#98c379', yellow: '#e5c07b',
    blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2',
  },
  light: {
    label: 'light terminal',
    bg: '#ffffff', fg: '#1f2328',
    red: '#cf222e', green: '#116329', yellow: '#7d4e00',
    blue: '#0969da', magenta: '#8250df', cyan: '#1b7c83',
  },
}

const SGR_COLOR = { 31: 'red', 32: 'green', 33: 'yellow', 34: 'blue', 35: 'magenta', 36: 'cyan' }

const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])

// Translate one ANSI line into styled spans. We only implement the SGR subset
// theme.js actually emits — colours 31-36, bold (1), dim (2) and reset (0) —
// because anything else appearing here would be a bug worth noticing, not a case
// to silently swallow.
function ansiToHtml(line, theme) {
  let out = ''
  let color = null
  let bold = false
  let dim = false
  let i = 0
  const flush = (text) => {
    if (!text) return
    const style = []
    if (color) style.push(`color:${theme[color]}`)
    if (bold) style.push('font-weight:700')
    // `dim` is an SGR attribute, not a colour: it's defined relative to the
    // current foreground, so opacity — not a hardcoded grey — is the honest
    // translation, and it stays correct on both palettes.
    if (dim) style.push('opacity:.45')
    out += style.length ? `<span style="${style.join(';')}">${escapeHtml(text)}</span>` : escapeHtml(text)
  }
  while (i < line.length) {
    // Match the ESC byte, not a bare '[' — a branch or directory name is free to
    // contain a literal bracket, and that has to stay text.
    const esc = line.indexOf('\u001b[', i)
    if (esc === -1) { flush(line.slice(i)); break }
    flush(line.slice(i, esc))
    const end = line.indexOf('m', esc)
    if (end === -1) break
    for (const code of line.slice(esc + 2, end).split(';').map(Number)) {
      if (code === 0) { color = null; bold = false; dim = false }
      else if (code === 1) bold = true
      else if (code === 2) dim = true
      else if (SGR_COLOR[code]) color = SGR_COLOR[code]
    }
    i = end + 1
  }
  return out
}

const FONT = "'JetBrains Mono','Noto Sans Mono','Noto Sans Math',ui-monospace,monospace"

// A terminal pane: the rendered line on that theme's own background, labelled so
// the dark/light comparison reads as deliberate rather than as two screenshots.
function pane(themeKey, lines, { size = 17 } = {}) {
  const t = THEMES[themeKey]
  const body = lines
    .map((l) => `<div class="line">${ansiToHtml(l, t)}</div>`)
    .join('')
  return `<section class="pane" style="background:${t.bg};color:${t.fg};font-size:${size}px">
      <span class="tag" style="color:${t.fg}">${t.label}</span>
      ${body}
    </section>`
}

const CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:${FONT};-webkit-font-smoothing:antialiased}
  .pane{padding:26px 28px 28px;border-radius:10px;position:relative;overflow:hidden;line-height:1.9}
  .line{white-space:pre}
  .tag{display:block;font-size:10px;letter-spacing:.16em;text-transform:uppercase;opacity:.4;margin-bottom:14px}
`

// columns: 200 keeps the layout engine from packing these into rows — the images
// want the whole line on one row, and the panes are sized to hold it.
const detailed = render(demo, loadConfig({ preset: 'detailed' }), { columns: 200 })
const standard = render(demo, loadConfig({ preset: 'standard' }), { columns: 200 })

// Widest line each image must hold, minus the pane's own padding.
const CARD_SIZE = fitSize(detailed, 1280 - 64 * 2 - 24 * 2, 19)
const HERO_SIZE = fitSize(detailed, 1120 - 26 * 2 - 28 * 2, 18)

// Hero: the SAME line, twice, on two terminal themes — and nothing else. The two
// panes must show identical content or the comparison stops being a comparison,
// which is why the presets are documented as text in the README instead of being
// smuggled in here. The canvas is dark and self-contained so the picture renders
// the same on GitHub's light and dark README themes.
const hero = `<!doctype html><meta charset="utf-8"><style>${CSS}
  body{background:#0d1017}
  .hero{width:1120px;background:#0d1017;padding:26px;border-radius:14px;display:flex;flex-direction:column;gap:10px}
</style>
<div class="hero" id="shot">
  ${pane('dark', [detailed], { size: HERO_SIZE })}
  ${pane('light', [detailed], { size: HERO_SIZE })}
</div>`

// Social card: 1280x640 is what GitHub and every link unfurler crops to.
//
// The status line — not the wordmark — is the hero here. It is the product, it is
// the only thing on the card a stranger can't get from the name, and it has to
// stay readable when a feed shrinks this to a thumbnail, so it gets the largest
// type. The wordmark shares the top row with the install command, which is the
// one thing a convinced reader wants next.
const card = `<!doctype html><meta charset="utf-8"><style>${CSS}
  body{background:#0d1017;color:#e6e9ef}
  .card{width:1280px;height:640px;padding:54px 64px;display:flex;flex-direction:column;justify-content:center;gap:34px}
  .top{display:flex;align-items:flex-end;justify-content:space-between}
  .eyebrow{font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#56b6c2;margin-bottom:10px}
  .wordmark{font-size:56px;font-weight:700;letter-spacing:-.035em;line-height:1}
  /* The context bar is ccbrief's most recognisable mark, so it does the work a
     generic gradient rule would otherwise be doing. */
  .rule{font-size:19px;letter-spacing:-.08em;margin-top:12px}
  .chip{border:1px solid #2c313c;border-radius:7px;padding:11px 15px;font-size:16px;color:#e6e9ef}
  .panes{display:flex;flex-direction:column;gap:9px}
  .panes .pane{padding:20px 24px;line-height:1.75}
  .foot{display:flex;gap:22px;align-items:baseline;font-size:17px;color:#abb2bf}
  .foot b{color:#e6e9ef;font-weight:400}
  .meta{font-size:14px;opacity:.6;margin-left:auto}
</style>
<div class="card" id="shot">
  <div class="top">
    <div>
      <p class="eyebrow">Status line for Claude Code</p>
      <h1 class="wordmark">ccbrief</h1>
      <p class="rule"><span style="color:#98c379">━━━━</span><span style="color:#abb2bf;opacity:.35">─────</span></p>
    </div>
    <span class="chip">npx ccbrief init</span>
  </div>
  <div class="panes">
    ${pane('dark', [detailed], { size: CARD_SIZE })}
    ${pane('light', [detailed], { size: CARD_SIZE })}
  </div>
  <div class="foot">
    <span><b>Context, tokens, cost and rate limits</b> — at a glance.</span>
    <span class="meta">zero runtime deps · no telemetry · MIT</span>
  </div>
</div>`

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true })
writeFileSync(new URL('../assets/hero.html', import.meta.url), hero)
writeFileSync(new URL('../assets/social-card.html', import.meta.url), card)
console.log('demo: assets/hero.html, assets/social-card.html — screenshot #shot to refresh the PNGs')
