// Impure git collector. Cached per session_id (not PID) so repeated renders in a
// session stay fast — Claude spawns a fresh process per update, so an in-process
// cache would never hit. `run` is an injectable spawn seam: tests force a
// cache hit/miss without real timing, and it keeps the render path cross-platform.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CACHE_TTL_MS = 3_000

// execFileSync (not exec) → no shell, so no injection from branch/dir names.
const defaultRun = (file, args, opts) =>
  execFileSync(file, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...opts })

export function collectGit(input, { cacheDir, sessionId, run = defaultRun, now = Date.now } = {}) {
  const cwd = input?.workspace?.current_dir
  const sid = sessionId ?? input?.session_id ?? 'default'
  if (!cwd) return null

  const cacheFile = cacheDir ? join(cacheDir, `git-${sid}.json`) : null
  if (cacheFile) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, 'utf8'))
      if (now() - cached.at < CACHE_TTL_MS) return cached.value
    } catch { /* miss → fall through */ }
  }

  let value = null
  try {
    const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd }).trim()
    if (branch) {
      const numstat = run('git', ['diff', '--numstat'], { cwd })
      let added = 0, removed = 0
      for (const line of numstat.split('\n')) {
        const [a, d] = line.split('\t')
        if (a && a !== '-') added += Number(a) || 0
        if (d && d !== '-') removed += Number(d) || 0
      }
      value = { branch, added, removed }
    }
  } catch {
    value = null // not a repo / git missing → hide, never throw
  }

  if (cacheFile) {
    try { writeFileSync(cacheFile, JSON.stringify({ at: now(), value })) } catch { /* best-effort */ }
  }
  return value
}
