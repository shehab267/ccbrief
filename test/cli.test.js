// The CLI's manners. Only the commands that touch nothing are exercised here —
// `init`, `config` and `uninstall` write to a real config dir, and are covered by
// their own command tests against throwaway directories.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ccbrief.js')

// stdin: 'ignore' is the whole point of these tests — it is what a pipe, a CI runner
// and `< /dev/null` all look like, and it is the case the seam-injected command tests
// structurally cannot reach, because they never run the real readline prompt.
const run = (args, dir) => spawnSync(process.execPath, [BIN, ...args], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  env: dir ? { ...process.env, CLAUDE_CONFIG_DIR: dir } : process.env,
})
const settingsOf = (dir) => JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
const tmp = () => mkdtempSync(join(tmpdir(), 'ccbrief-cli-'))

// A typo used to print the help and exit 0. `ccbrief instal` looked like it had
// worked, and any script checking the exit code was told it had.
test('an unknown command fails, on stderr', () => {
  const r = run(['instal'])
  assert.equal(r.status, 1)
  assert.match(r.stderr, /unknown command "instal"/)
  assert.equal(r.stdout, '', 'the help belongs on stderr when it is an error')
})

test('--help and -h print the help and succeed', () => {
  for (const flag of ['--help', '-h', 'help']) {
    const r = run([flag])
    assert.equal(r.status, 0, flag)
    assert.match(r.stdout, /usage:/, flag)
  }
})

// Asking for nothing is not an error.
test('bare `ccbrief` prints the help and succeeds', () => {
  const r = run([])
  assert.equal(r.status, 0)
  assert.match(r.stdout, /usage:/)
})

test('--version prints a bare version', () => {
  const r = run(['--version'])
  assert.equal(r.status, 0)
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/)
})

// "TUI" is the exact kind of word this tool decided not to use: it names an
// implementation, not a thing anyone can want.
test('the help speaks plainly', () => {
  const help = run(['--help']).stdout
  assert.ok(!/TUI/i.test(help), help)
  assert.match(help, /live preview/)
})

// The prompt that could not be answered. readline's question() never settles at EOF,
// so with no terminal on stdin the await dangled and node aborted with exit 13 — and
// because uninstall asked BEFORE restoring settings.json, a piped or CI uninstall took
// the status line off nothing at all and left the user installed, looking like it ran.
//
// This has to go through the real binary: the uninstall command tests inject `ask` as a
// seam, so they never execute the prompt and stayed green through the whole bug.
test('uninstall with no terminal on stdin still uninstalls', () => {
  const dir = tmp()
  assert.equal(run(['init'], dir).status, 0)
  assert.ok('statusLine' in settingsOf(dir), 'init should have installed one')

  const r = run(['uninstall'], dir)
  assert.equal(r.status, 0, `exit 13 is the dangling-await abort: ${r.stderr}`)
  assert.equal('statusLine' in settingsOf(dir), false, 'the status line must actually be gone')
})

// Silence is not consent. With nobody to answer, `init` must not seize a statusLine it
// did not install — it declines, says so, and leaves the other tool's command intact.
test('init with no terminal on stdin will not clobber a foreign statusLine', () => {
  const dir = tmp()
  const theirs = { statusLine: { type: 'command', command: 'my-own-script.sh' } }
  writeFileSync(join(dir, 'settings.json'), JSON.stringify(theirs))

  const r = run(['init'], dir)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /kept/i)
  assert.deepEqual(settingsOf(dir), theirs, 'their status line must survive untouched')
  assert.equal(existsSync(join(dir, 'ccbrief')), false, 'and we install nothing behind their back')
})
