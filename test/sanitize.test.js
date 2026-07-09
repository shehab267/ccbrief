import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clean } from '../src/format.js'
import { BY_ID } from '../src/segments/index.js'
import { makeTheme } from '../src/theme.js'

const plain = makeTheme({ glyphs: 'ascii', colors: false, icons: false })

test('clean strips C0/C1 control chars (ESC, BEL, newline)', () => {
  assert.equal(clean('a\x1bb\x07c\nd'), 'abcd')
  assert.equal(clean(null), '')
  assert.equal(clean('plain'), 'plain')
})

test('segments strip control chars from session-derived values', () => {
  // A hostile directory/model value must not inject escape sequences or extra rows.
  assert.equal(BY_ID.directory.format({ workspace: { current_dir: '/x/ev\x1bil\nrow' } }, plain), 'evilrow')
  assert.equal(BY_ID.model.format({ model: { display_name: 'Op\x07us' } }, plain), 'Opus')
  assert.equal(BY_ID.agent.format({ agent: { name: 'a\x1bgent' } }, plain), 'agent')
})

test('pr segment only wraps http(s) urls in an OSC 8 hyperlink', () => {
  const bad = BY_ID.pr.format({ pr: { number: 7, review_state: 'approved', url: 'javascript:alert(1)' } }, plain)
  assert.ok(!bad.includes('\x1b]8'), 'non-web scheme must not become a hyperlink')
  assert.ok(bad.includes('#7'))
  const good = BY_ID.pr.format({ pr: { number: 8, review_state: 'approved', url: 'https://example.com/pull/8' } }, plain)
  assert.ok(good.includes('\x1b]8;;https://example.com/pull/8\x07'))
})
