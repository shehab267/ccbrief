import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeTheme } from '../src/theme.js'

test('colors off → no ANSI', () => {
  const t = makeTheme({ symbols: 'emoji', colors: false, icons: true })
  assert.equal(t.color('green', 'ok'), 'ok')
})

test('colors on → wraps in a NORMAL ANSI palette slot, never truecolor', () => {
  const t = makeTheme({ symbols: 'emoji', colors: true, icons: true })
  // Slot 32, not 38;2;r;g;b. The slot is resolved by the user's terminal theme
  // against its own background, which is what keeps it legible on dark AND light.
  assert.equal(t.color('green', 'ok'), '\x1b[32mok\x1b[0m')
})

// The bright slots (90-97) are *defined* as lighter, so they wash out on a light
// background. Nothing in the palette may use one, and nothing may pin RGB.
test('no accent uses truecolor or a bright slot (light-background safety)', () => {
  const t = makeTheme({ colors: true })
  for (const name of ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'cyanBold']) {
    const out = t.color(name, 'x')
    assert.ok(!out.includes('38;2;'), `${name} must not pin truecolor`)
    assert.ok(!/\x1b\[(?:1;)?9[0-7]m/.test(out), `${name} must not use a bright slot`)
  }
})

// Identity text sits at the DEFAULT foreground — no escape at all. That is the
// colour the user chose to read text in, so it is legible on their background by
// definition. `dim` here was the thing that read as washed-out.
test('primary leaves identity text at the default foreground', () => {
  assert.equal(makeTheme({ colors: true }).primary('dir'), 'dir')
  assert.equal(makeTheme({ colors: false }).primary('dir'), 'dir')
})

test('secondary recedes to dim when colors on, untouched when off', () => {
  assert.equal(makeTheme({ colors: true }).secondary('wk'), '\x1b[2mwk\x1b[0m')
  assert.equal(makeTheme({ colors: false }).secondary('wk'), 'wk')
})

// `orange` had no ANSI slot and its only caller (the countdown ramp) is gone.
test('orange is dropped — unknown names pass through unstyled', () => {
  assert.equal(makeTheme({ colors: true }).color('orange', 'x'), 'x')
})

// Bold cyan stands in for the reference line's bright cyan (96) without the
// light-background hazard: same hue, lifted relative to the foreground.
test('cyanBold is bold + the normal cyan slot, not bright cyan', () => {
  assert.equal(makeTheme({ colors: true }).color('cyanBold', 'Opus'), '\x1b[1;36mOpus\x1b[0m')
})

test('bar with a tone → colored fill + dimmed empty', () => {
  const t = makeTheme({ symbols: 'emoji', colors: true })
  // 33% of 9 = 3 filled; fill takes the tone, remainder is dimmed
  assert.equal(t.bar(33, 9, 'green'), '\x1b[32m━━━\x1b[0m\x1b[2m──────\x1b[0m')
})

test('bar without a tone stays plain (snapshot/ascii safe)', () => {
  assert.equal(makeTheme({ colors: true }).bar(42, 9), '━━━━─────')
})

test('separators are dimmed when colors are on, plain when off', () => {
  assert.equal(makeTheme({ colors: true }).sep, '\x1b[2m │ \x1b[0m')
  assert.equal(makeTheme({ colors: false }).sep, ' │ ')
})

// The per-mode timer split IS the cross-terminal fallback: emoji mode gets the
// reference line's ⏳, while the DEFAULT (simple) keeps the monochrome ⧗ that
// every font ships single-width. Nobody lands on tofu without opting in.
test('emoji mode gets ⏳; the default mode falls back to the universal ⧗', () => {
  assert.equal(makeTheme({ symbols: 'emoji', colors: false, icons: true }).symbol('reset'), '⏳')
  assert.equal(makeTheme({ colors: false, icons: true }).symbol('reset'), '⧗')
  assert.equal(makeTheme({ symbols: 'nerd-font', colors: false, icons: true }).symbol('reset'), '⧗')
})

test('emoji tokens glyph is the reference diamond; absent in simple mode', () => {
  assert.equal(makeTheme({ symbols: 'emoji', colors: false, icons: true }).symbol('tokens'), '🔸')
  assert.equal(makeTheme({ colors: false, icons: true }).symbol('tokens'), '')
})

test('icons off → glyph is empty', () => {
  const t = makeTheme({ symbols: 'emoji', colors: true, icons: false })
  assert.equal(t.symbol('branch'), '')
})

test('emoji branch glyph', () => {
  const t = makeTheme({ symbols: 'emoji', colors: false, icons: true })
  assert.equal(t.symbol('branch'), '🌿')
})

test('emoji model glyph is distinct from thinking', () => {
  const t = makeTheme({ symbols: 'emoji', colors: false, icons: true })
  assert.equal(t.symbol('model'), '🧠')
  assert.equal(t.symbol('thinking'), '💭')
})

test('bar(42) is 4 filled + 5 empty in emoji mode', () => {
  const t = makeTheme({ symbols: 'emoji', colors: false, icons: true })
  assert.equal(t.bar(42, 9), '━━━━─────')
})

test('ascii mode is pure ASCII', () => {
  const t = makeTheme({ symbols: 'ascii', colors: false, icons: true })
  assert.equal(t.bar(42, 9), '####-----')
  assert.match(t.sep, /^ \| $/)
  // eslint-disable-next-line no-control-regex
  assert.ok(/^[\x00-\x7f]*$/.test(t.symbol('branch') + t.bar(50) + t.sep))
})

// `simple` is the default: no pictographs (identical everywhere), but keeps the
// universal ⧗ timer + box-drawing gauge/separator, so it still has structure.
test('simple mode: no pictographs, keeps ⧗ + box-drawing', () => {
  const t = makeTheme({ symbols: 'simple', colors: false, icons: true })
  for (const n of ['branch', 'tokens', 'effort', 'model', 'duration', 'cost', 'pr', 'worktree']) {
    assert.equal(t.symbol(n), '', `${n} should have no symbol in the simple set`)
  }
  assert.equal(t.symbol('reset'), '⧗')  // the one universal symbol survives
  assert.equal(t.bar(42, 9), '━━━━─────')
  assert.match(t.sep, /^ │ $/)
})

test('simple is the default symbol set (no symbols arg → no branch pictograph)', () => {
  assert.equal(makeTheme({ colors: false, icons: true }).symbol('branch'), '')
})

// nerd-font is no longer empty: its glyphs are real Nerd-Font Private-Use points
// (they render only with a Nerd Font installed, but must be present, not blank).
test('nerd-font set has non-empty PUA symbols', () => {
  const t = makeTheme({ symbols: 'nerd-font', colors: false, icons: true })
  assert.equal(t.symbol('branch').codePointAt(0), 0xe0a0)
  assert.ok(t.symbol('effort').length > 0 && t.symbol('model').length > 0)
})

// Icon spacing lives in ONE place (theme.icon), so no segment can re-invent it.
// An emoji is double-width — the terminal reserves a trailing column its artwork
// doesn't fill — so a space on top double-spaces the icon from its value.
test('icon: double-width emoji brings its own gap; narrower glyphs take a space', () => {
  assert.equal(makeTheme({ symbols: 'emoji', colors: false }).icon('model'), '🧠')
  assert.equal(makeTheme({ symbols: 'simple', colors: false }).icon('reset'), '⧗ ')
  assert.equal(makeTheme({ symbols: 'nerd-font', colors: false }).icon('reset'), '⧗ ')
})

test('icon: absent glyph yields nothing at all — never a leading space', () => {
  assert.equal(makeTheme({ symbols: 'simple', colors: false }).icon('model'), '')
  assert.equal(makeTheme({ symbols: 'emoji', colors: false, icons: false }).icon('model'), '')
})

test('icon: tone colours the glyph only, and sits inside the gap', () => {
  assert.equal(makeTheme({ symbols: 'simple', colors: true }).icon('reset', 'green'), '\x1b[32m⧗\x1b[0m ')
})
