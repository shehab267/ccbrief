import { test } from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../src/render.js'
import * as fx from './fixtures.js'

const cfg = (segments, over = {}) => ({
  version: 1, preset: 'custom', layout: 'single-line', maxRows: 3,
  glyphs: 'ascii', colors: false, icons: false, segments, ...over,
})

test('renders enabled+available segments in order', () => {
  const out = render(fx.standard, cfg([{ id: 'repo', enabled: true }, { id: 'context', enabled: true }, { id: 'model', enabled: true }]), { columns: 200 })
  assert.equal(out, 'ccbrief/main +3/-1 | 42% ####----- | Opus')
})

test('unavailable segment (context post-/compact) is omitted', () => {
  const out = render(fx.postCompact, cfg([{ id: 'repo', enabled: true }, { id: 'context', enabled: true }, { id: 'model', enabled: true }]), { columns: 200 })
  assert.equal(out, 'ccbrief/main | Opus')
})

test('disabled segment is omitted', () => {
  const out = render(fx.standard, cfg([{ id: 'repo', enabled: true }, { id: 'model', enabled: false }]), { columns: 200 })
  assert.equal(out, 'ccbrief/main +3/-1')
})
