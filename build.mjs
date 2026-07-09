import { build } from 'esbuild'

// Bundle the status-line renderer into a single self-contained file with no
// runtime dependencies, so `ccbrief init` can copy it to ~/.claude/ccbrief/
// and it keeps working after the npx cache is evicted.
await build({
  entryPoints: ['src/statusline.js'],
  outfile: 'dist/statusline.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
})

console.log('build: dist/statusline.js')
