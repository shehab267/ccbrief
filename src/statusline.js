// Impure entry point. Claude Code spawns a fresh Node process per update, pipes
// the session JSON on stdin, and captures stdout as the status line. One process,
// one JSON parse (replaces the old bash + ~20 jq spawns).
//
// The whole body is wrapped so ANY failure emits an empty line — never crash
// Claude's UI.
import { render } from './render.js'
import { collectGit } from './git.js'
import { tmpdir } from 'node:os'

// TEMPORARY (Task 10 ordering caveat): inline default config + no config-file
// read until config.js (Task 12) and paths.js (Task 13) land, at which point
// these are replaced by `loadConfig(readConfigFile())`.
const DEFAULT_CONFIG = {
  version: 1,
  preset: 'standard',
  layout: 'auto',
  maxRows: 3,
  glyphs: 'emoji',
  colors: true,
  icons: true,
  segments: [
    { id: 'repo', enabled: true },
    { id: 'context', enabled: true },
    { id: 'duration', enabled: true },
    { id: 'model', enabled: true },
  ],
}

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
  const columns = Number(process.env.COLUMNS) || 80 // captured output → no TTY; read COLUMNS
  process.stdout.write(render(input, DEFAULT_CONFIG, { columns }))
} catch {
  // Never crash Claude's UI on any failure — emit nothing.
  process.stdout.write('')
}
