import { test } from 'node:test'
import assert from 'node:assert/strict'

import { visibleWidth } from '../src/width.js'

test('visibleWidth ignores ANSI SGR sequences', () => {
  assert.equal(visibleWidth('\x1b[32mhi\x1b[0m'), 2)
})

test('visibleWidth counts a plain ASCII string', () => {
  assert.equal(visibleWidth('main'), 4)
})
