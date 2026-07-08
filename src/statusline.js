// Impure entry point. Claude Code spawns a fresh Node process per update, pipes
// the session JSON on stdin, and captures stdout as the status line. One process,
// one JSON parse (replaces the old bash + ~20 jq spawns).
//
// The whole body is wrapped so ANY failure emits an empty line — never crash
// Claude's UI.
import { render } from './render.js'
import { collectGit } from './git.js'
import { loadConfig } from './config.js'
import { tmpdir } from 'node:os'

// TEMPORARY (until Task 13): no config-file read yet, so load defaults. Task 13
// swaps this for `loadConfig(readConfigFile())` once paths.js lands.
function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    if (process.stdin.isTTY) return resolve('')
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (c) => (data += c))
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', () => resolve(''))
  })
}

try {
  const raw = await readStdin()
  const input = JSON.parse(raw || '{}')
  input.now = Date.now() // injected so rate-limit countdowns tick each render
  input.git = collectGit(input, { cacheDir: tmpdir(), sessionId: input.session_id })
  const config = loadConfig(null) // Task 13: loadConfig(readConfigFile())
  const columns = Number(process.env.COLUMNS) || 80 // captured output → no TTY; read COLUMNS
  process.stdout.write(render(input, config, { columns }))
} catch {
  // Never crash Claude's UI on any failure — emit nothing.
  process.stdout.write('')
}
