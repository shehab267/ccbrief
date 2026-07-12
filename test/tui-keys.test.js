// The keypress loop used to be untestable: it read process.stdin directly. It now
// takes input/output seams (same idea as init.js's copyRenderer/confirm), so the
// quit/save keys — the ones a user reaches for first — are covered for real.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runConfigTui } from '../src/tui/index.js'

// A fake TTY: raw mode is a no-op, and writes into it arrive as keypresses.
const fakeTty = () => Object.assign(new PassThrough(), { isTTY: true, setRawMode: () => {} })
const sink = () => ({ write: () => {} })
const tmp = () => mkdtempSync(join(tmpdir(), 'ccbrief-tui-'))

test('esc quits without saving', async () => {
  const dir = tmp()
  const input = fakeTty()
  const done = runConfigTui({ dir, initialConfig: {}, input, output: sink() })
  input.write('\x1b')
  assert.equal(await done, undefined)                          // no config returned → nothing to sync
  assert.equal(existsSync(join(dir, 'config.json')), false)    // and nothing written
})

test('q quits without saving', async () => {
  const dir = tmp()
  const input = fakeTty()
  const done = runConfigTui({ dir, initialConfig: {}, input, output: sink() })
  input.write('q')
  assert.equal(await done, undefined)
  assert.equal(existsSync(join(dir, 'config.json')), false)
})

test('s saves, writes config.json, and returns the saved config', async () => {
  const dir = tmp()
  const input = fakeTty()
  const done = runConfigTui({ dir, initialConfig: {}, input, output: sink() })
  input.write('s')
  const saved = await done
  assert.ok(saved, 'save must return the config so the caller can re-sync settings.json')
  assert.equal(saved.preset, 'standard')
  // The returned config carries the full segment list (the caller re-syncs settings.json
  // from it); the FILE drops it, because `standard` derives its own. Everything else matches.
  const { segments, ...rest } = saved
  assert.ok(segments.length, 'the returned config keeps its segments')
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8')), rest)
})

// Esc is the first byte of every arrow-key sequence. In raw mode an arrow arrives
// as one '\x1b[A' chunk, so it must steer the cursor — not quit.
test('an arrow key is not mistaken for esc', async () => {
  const dir = tmp()
  const input = fakeTty()
  const done = runConfigTui({ dir, initialConfig: {}, input, output: sink() })
  input.write('\x1b[B')                            // ↓ — must steer, not quit
  await new Promise(setImmediate)                  // a real second keypress is its own chunk
  input.write('s')
  assert.ok(await done, 'arrow key quit the TUI instead of moving the cursor')
})

// `y` cycles the symbol set (`s` is taken by save). `g` — what the key was when the
// setting was called "glyphs" — must keep working, or the rename silently breaks a
// habit for every existing user.
for (const key of ['y', 'g']) {
  test(`${key} cycles the symbol set`, async () => {
    const dir = tmp()
    const input = fakeTty()
    const done = runConfigTui({ dir, initialConfig: { symbols: 'simple' }, input, output: sink() })
    input.write(key)
    await new Promise(setImmediate)
    input.write('s')
    assert.equal((await done).symbols, 'emoji') // simple → emoji, the next set in the cycle
  })
}
