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
  assert.equal(gitCacheName('abc-123_XYZ'), 'git-abc-123_XYZ.json') // safe chars kept as-is
  const evil = gitCacheName('../../etc/passwd')
  assert.ok(!evil.includes('/') && !evil.includes('..'), evil)      // cannot traverse out of cacheDir
  assert.equal(gitCacheName('a/b\\c'), 'git-a_b_c.json')            // separators neutralized
  assert.equal(gitCacheName(undefined), 'git-default.json')         // missing id → stable default
})

test('returns null outside a git repo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-nogit-'))
  const cacheDir = mkdtempSync(join(tmpdir(), 'ccbrief-cache-'))
  const g = collectGit({ workspace: { current_dir: dir }, session_id: 's3' }, { cacheDir })
  assert.equal(g, null)
})
