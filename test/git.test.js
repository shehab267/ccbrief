import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectGit, gitCacheName } from '../src/git.js'

function tmpRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-git-'))
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' })
  git('init', '-b', 'main')
  git('config', 'user.email', 't@t.dev')
  git('config', 'user.name', 'T')
  writeFileSync(join(dir, 'a.txt'), 'one\n')
  git('add', 'a.txt'); git('commit', '-m', 'init')
  writeFileSync(join(dir, 'a.txt'), 'one\ntwo\n') // 1 line added, uncommitted
  return dir
}

test('collectGit reads branch + numstat from a real repo', () => {
  const dir = tmpRepo()
  const cacheDir = mkdtempSync(join(tmpdir(), 'ccbrief-cache-'))
  const g = collectGit({ workspace: { current_dir: dir }, session_id: 's1' }, { cacheDir })
  assert.equal(g.branch, 'main')
  assert.equal(g.added, 1)
  assert.equal(g.removed, 0)
})

test('second call with same session_id uses cache (no spawn)', () => {
  const dir = tmpRepo()
  const cacheDir = mkdtempSync(join(tmpdir(), 'ccbrief-cache-'))
  const args = [{ workspace: { current_dir: dir }, session_id: 's2' }, { cacheDir }]
  const first = collectGit(...args)
  let spawned = false
  const run = () => { spawned = true; return '' }
  const second = collectGit(args[0], { cacheDir, run })
  assert.deepEqual(second, first)
  assert.equal(spawned, false)
})

test('gitCacheName confines the cache filename (no path escape)', () => {
  const evil = gitCacheName('../../etc/passwd', '/x')
  assert.ok(!evil.includes('/') && !evil.includes('..'), evil)             // cannot traverse out of cacheDir
  assert.match(gitCacheName('abc-123_XYZ', '/x'), /^git-abc-123_XYZ-[0-9a-f]{12}\.json$/) // safe chars kept
  assert.match(gitCacheName('a/b\\c', '/x'), /^git-a_b_c-[0-9a-f]{12}\.json$/)            // separators neutralized
  assert.match(gitCacheName(undefined, '/x'), /^git-default-[0-9a-f]{12}\.json$/)         // missing id → stable
})

// The bug the directory half of the key exists to kill. The cache was keyed on the
// session ALONE, so the second directory a session rendered — /add-dir, a cd, a
// worktree — was served the first one's branch for the next three seconds. A status
// line confidently naming the wrong branch is worse than one naming none.
test('the cache key is the directory as well as the session', () => {
  assert.notEqual(gitCacheName('s1', '/a'), gitCacheName('s1', '/b'))
})

test('a second directory in the same session is not served the first one\'s branch', () => {
  const repo = tmpRepo()
  const notARepo = mkdtempSync(join(tmpdir(), 'ccbrief-plain-'))
  const cacheDir = mkdtempSync(join(tmpdir(), 'ccbrief-cache-'))
  const session = 'same-session'

  assert.equal(collectGit({ workspace: { current_dir: repo }, session_id: session }, { cacheDir }).branch, 'main')
  // Same session, different directory, well inside the 3s TTL: it must run git again
  // and report "not a repo" rather than hand back the cached `main`.
  assert.equal(collectGit({ workspace: { current_dir: notARepo }, session_id: session }, { cacheDir }), null)
})

test('returns null outside a git repo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-nogit-'))
  const cacheDir = mkdtempSync(join(tmpdir(), 'ccbrief-cache-'))
  const g = collectGit({ workspace: { current_dir: dir }, session_id: 's3' }, { cacheDir })
  assert.equal(g, null)
})
