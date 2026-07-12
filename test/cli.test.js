// The CLI's manners. Only the commands that touch nothing are exercised here —
// `init`, `config` and `uninstall` write to a real config dir, and are covered by
// their own command tests against throwaway directories.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ccbrief.js')
const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' })

// A typo used to print the help and exit 0. `ccbrief instal` looked like it had
// worked, and any script checking the exit code was told it had.
test('an unknown command fails, on stderr', () => {
  const r = run('instal')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /unknown command "instal"/)
  assert.equal(r.stdout, '', 'the help belongs on stderr when it is an error')
})

test('--help and -h print the help and succeed', () => {
  for (const flag of ['--help', '-h', 'help']) {
    const r = run(flag)
    assert.equal(r.status, 0, flag)
    assert.match(r.stdout, /usage:/, flag)
  }
})

// Asking for nothing is not an error.
test('bare `ccbrief` prints the help and succeeds', () => {
  const r = run()
  assert.equal(r.status, 0)
  assert.match(r.stdout, /usage:/)
})

test('--version prints a bare version', () => {
  const r = run('--version')
  assert.equal(r.status, 0)
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/)
})

// "TUI" is the exact kind of word this tool decided not to use: it names an
// implementation, not a thing anyone can want.
test('the help speaks plainly', () => {
  const help = run('--help').stdout
  assert.ok(!/TUI/i.test(help), help)
  assert.match(help, /live preview/)
})
