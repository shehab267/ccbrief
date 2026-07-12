// Impure git collector. Cached per session_id (not PID) so repeated renders in a
// session stay fast — Claude spawns a fresh process per update, so an in-process
// cache would never hit. `run` is an injectable spawn seam: tests force a
// cache hit/miss without real timing, and it keeps the render path cross-platform.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const CACHE_TTL_MS = 3_000

// execFileSync (not exec) → no shell, so no injection from branch/dir names.
// timeout bounds a hung git (e.g. credential prompt); 3s matches the cache TTL
// (git only runs that often) so it kills true hangs without clipping a slow but
// valid diff in a large monorepo. maxBuffer keeps a huge numstat from throwing
// on the 1 MB default. Either failure is caught below → the git segment simply
// hides, never crashes the render.
const defaultRun = (file, args, opts) =>
  execFileSync(file, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3_000, maxBuffer: 10 * 1024 * 1024, ...opts })

// The cache key is the session AND the directory the entry describes.
//
// It used to be the session alone. Two bad things followed. A session that renders
// more than one directory — /add-dir, a cd, a worktree — was served the FIRST
// directory's branch for the next three seconds, so the status line got its one job
// wrong. And with no session_id the name collapsed to a fixed `git-default.json`;
// in the shared system temp dir that older versions used, that is a predictable,
// world-writable path any local process could plant or point elsewhere by symlink.
// Hashing the directory into the name fixes the first. The cache moving under the
// user's own ccbrief dir (statusline.js) fixes the second.
//
// The session part is still reduced to a safe token: a session_id carrying path
// separators must not escape cacheDir.
export function gitCacheName(sid, cwd = '') {
  const session = String(sid ?? 'default').replace(/[^A-Za-z0-9_-]/g, '_')
  const where = createHash('sha256').update(String(cwd)).digest('hex').slice(0, 12)
  return `git-${session}-${where}.json`
}

export function collectGit(input, { cacheDir, sessionId, run = defaultRun, now = Date.now } = {}) {
  const cwd = input?.workspace?.current_dir
  const sid = sessionId ?? input?.session_id ?? 'default'
  if (!cwd) return null

  const cacheFile = cacheDir ? join(cacheDir, gitCacheName(sid, cwd)) : null
  if (cacheFile) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, 'utf8'))
      const age = now() - cached.at
      // `age >= 0` matters: a timestamp in the future — clock skew, or a file someone
      // else wrote — would otherwise read as fresh forever and pin the status line to
      // a stale branch for the rest of the session.
      if (age >= 0 && age < CACHE_TTL_MS) return cached.value
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
    // Best-effort throughout: a read-only home, a full disk, a racing sibling render —
    // none of it is worth a blank status line, so a failed cache write just means the
    // next render runs git again.
    try {
      mkdirSync(cacheDir, { recursive: true })
      writeFileSync(cacheFile, JSON.stringify({ at: now(), value }))
    } catch { /* best-effort */ }
  }
  return value
}
