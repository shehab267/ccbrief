import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BY_ID } from '../src/segments/index.js'
import { makeTheme } from '../src/theme.js'

const plain = makeTheme({ glyphs: 'ascii', colors: false, icons: false })

test('repo hidden when no git', () => {
  assert.equal(BY_ID.repo.isAvailable({ git: null }), false)
})

test('repo renders name/branch with diff', () => {
  const input = { git: { branch: 'main', added: 3, removed: 1 }, workspace: { repo: { name: 'ccbrief' } } }
  assert.equal(BY_ID.repo.format(input, plain), 'ccbrief/main +3/-1')
})

test('repo omits diff when clean', () => {
  const input = { git: { branch: 'main', added: 0, removed: 0 }, workspace: { repo: { name: 'ccbrief' } } }
  assert.equal(BY_ID.repo.format(input, plain), 'ccbrief/main')
})

test('repo falls back to dir basename when repo.name absent', () => {
  const input = { git: { branch: 'x', added: 0, removed: 0 }, workspace: { current_dir: '/a/proj' } }
  assert.equal(BY_ID.repo.format(input, plain), 'proj/x')
})
