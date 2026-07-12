import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BY_ID } from '../src/segments/index.js'
import { makeTheme } from '../src/theme.js'
import { visibleWidth } from '../src/width.js'

const plain = makeTheme({ symbols: 'ascii', colors: false, icons: false })
const show = (id, input) => (BY_ID[id].isAvailable(input) ? BY_ID[id].format(input, plain) : null)

test('lines +/-', () => {
  assert.equal(show('lines', { cost: { total_lines_added: 120, total_lines_removed: 34 } }), '+120/-34')
})
test('lines hidden when both null', () => {
  assert.equal(show('lines', { cost: {} }), null)
})
test('pr plain when no url', () => {
  assert.equal(show('pr', { pr: { number: 7, review_state: 'approved' } }), '#7 approved')
})
test('pr hyperlink counts as visible text width only', () => {
  const out = show('pr', { pr: { number: 7, review_state: 'approved', url: 'https://x.dev/pr/7' } })
  assert.ok(out.includes('\x1b]8;;https://x.dev/pr/7\x07'))
  assert.equal(visibleWidth(out), visibleWidth('#7 approved'))
})
test('pr hidden without a number', () => {
  assert.equal(show('pr', { pr: {} }), null)
})
test('worktree basename', () => {
  assert.equal(show('worktree', { workspace: { git_worktree: '/home/dev/wt/ccbrief-pr' } }), 'ccbrief-pr')
})
test('worktree hidden in main tree', () => {
  assert.equal(show('worktree', { workspace: {} }), null)
})
