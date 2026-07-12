// Guards the #1 architectural invariant: the bundled renderer copied into
// ~/.claude/ccbrief/ MUST be fully self-contained (string-width inlined by
// esbuild → zero runtime deps), so it keeps working after the npx cache is
// evicted. CI builds the bundle but nothing asserted it stayed self-contained;
// this test bundles in-memory and fails if any external import survives.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

const bundle = () => build({
  entryPoints: ['src/statusline.js'],
  bundle: true, platform: 'node', target: 'node22', format: 'esm', write: false,
})

test('bundled renderer is self-contained (zero runtime deps)', async () => {
  const out = await bundle()
  const specs = externalSpecifiers(out.outputFiles[0].text)
  assert.deepEqual(specs, [], `bundle must inline all deps; found external imports: ${specs.join(', ')}`)
})

// Static analysis proves nothing about whether the thing RUNS. Every other test
// exercises src/, but `init` ships dist/ — so a builtin that fails to bundle would
// throw at module load, and because statusline.js swallows everything to protect
// Claude's UI, the whole line would just go quietly blank in production with the
// suite still green. Execute the bundle for real, against a real repo.
test('the bundled renderer actually runs, and renders a branch', async () => {
  const out = await bundle()
  const home = mkdtempSync(join(tmpdir(), 'ccbrief-bundle-'))
  const script = join(home, 'statusline.js')
  writeFileSync(script, out.outputFiles[0].text)

  const repo = mkdtempSync(join(tmpdir(), 'ccbrief-bundle-repo-'))
  const git = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'pipe' })
  git('init', '-b', 'main')
  git('config', 'user.email', 't@t.dev')
  git('config', 'user.name', 'T')
  writeFileSync(join(repo, 'a.txt'), 'one\n')
  git('add', 'a.txt'); git('commit', '-m', 'init')

  const r = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ session_id: 'b1', workspace: { current_dir: repo }, model: { display_name: 'Opus' } }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: home, COLUMNS: '120' },
  })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /main/, `bundle rendered nothing: ${JSON.stringify(r.stdout)}`)
  assert.match(r.stdout, /Opus/)
})
