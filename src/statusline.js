// ccbrief status-line renderer — reads Claude Code's JSON on stdin and prints
// the status line to stdout.
// Scaffold stub: the full segment catalog + layout engine land in later milestones.
import { visibleWidth } from './width.js'

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    if (process.stdin.isTTY) return resolve('')
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => (data += chunk))
    process.stdin.on('end', () => resolve(data))
  })
}

const raw = await readStdin()

let input = {}
try {
  input = JSON.parse(raw || '{}')
} catch {
  // Never crash Claude's UI on malformed input — emit nothing.
}

const dir = input?.workspace?.current_dir?.split(/[\\/]/).pop() ?? ''
const model = input?.model?.display_name ?? ''
const line = [dir, model].filter(Boolean).join(' | ')

// visibleWidth is exercised here so the bundled renderer includes it; the
// width-aware layout engine that consumes it arrives in a later milestone.
void visibleWidth(line)

process.stdout.write(line)
