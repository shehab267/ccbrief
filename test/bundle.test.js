// Guards the #1 architectural invariant: the bundled renderer copied into
// ~/.claude/ccbrief/ MUST be fully self-contained (string-width inlined by
// esbuild → zero runtime deps), so it keeps working after the npx cache is
// evicted. CI builds the bundle but nothing asserted it stayed self-contained;
// this test bundles in-memory and fails if any external import survives.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

// Bare specifiers that aren't relative (./ ../), absolute (/), or node: builtins
// are external runtime deps — exactly what must not appear in the shipped bundle.
function externalSpecifiers(code) {
  const specs = new Set()
  const add = (s) => { if (s && !s.startsWith('.') && !s.startsWith('/') && !s.startsWith('node:')) specs.add(s) }
  for (const m of code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) add(m[1])
  for (const m of code.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) add(m[1])
  for (const m of code.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) add(m[1])
  for (const m of code.matchAll(/(?:^|[;\n])\s*import\s*['"]([^'"]+)['"]/g)) add(m[1]) // side-effect import
  return [...specs]
}

test('bundled renderer is self-contained (zero runtime deps)', async () => {
  const out = await build({
    entryPoints: ['src/statusline.js'],
    bundle: true, platform: 'node', target: 'node22', format: 'esm', write: false,
  })
  const specs = externalSpecifiers(out.outputFiles[0].text)
  assert.deepEqual(specs, [], `bundle must inline all deps; found external imports: ${specs.join(', ')}`)
})
