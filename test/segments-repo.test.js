import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BY_ID } from '../src/segments/index.js'
import { makeTheme } from '../src/theme.js'

const plain = makeTheme({ glyphs: 'ascii', colors: false, icons: false })

test('repo hidden when no git', () => {
  assert.equal(BY_ID.repo.isAvailable({ git: null }), false)
})

test('repo hides the diff by default (showDiff off)', () => {
  const input = { git: { branch: 'main', added: 3, removed: 1 }, workspace: { repo: { name: 'ccbrief' } } }
  assert.equal(BY_ID.repo.format(input, plain), 'ccbrief/main')
})

test('repo omits diff when clean, even with showDiff on', () => {
  const input = { git: { branch: 'main', added: 0, removed: 0 }, workspace: { repo: { name: 'ccbrief' } } }
  assert.equal(BY_ID.repo.format(input, plain, { showDiff: true }), 'ccbrief/main')
})

// showDiff toggle: the `+N/-M` can be hidden to leave just the branch, and no
// entry (or showDiff:true) keeps the current default-shown behaviour.
test('repo hides the diff when showDiff is false', () => {
  const input = { git: { branch: 'main', added: 3, removed: 1 }, workspace: { repo: { name: 'ccbrief' } } }
  assert.equal(BY_ID.repo.format(input, plain, { showDiff: false }), 'ccbrief/main')
})
test('repo shows the diff when showDiff is true', () => {
  const input = { git: { branch: 'main', added: 3, removed: 1 }, workspace: { repo: { name: 'ccbrief' } } }
  assert.equal(BY_ID.repo.format(input, plain, { showDiff: true }), 'ccbrief/main +3/-1')
})

test('repo falls back to dir basename when repo.name absent', () => {
  const input = { git: { branch: 'x', added: 0, removed: 0 }, workspace: { current_dir: '/a/proj' } }
  assert.equal(BY_ID.repo.format(input, plain), 'proj/x')
})
