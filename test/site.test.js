import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import * as fx from './fixtures.js'
import { render } from '../src/render.js'
import { loadConfig } from '../src/config.js'
import { SEGMENTS } from '../src/segments/index.js'

// The docs site (site/) is a hand-written page with no generator, so nothing
// keeps it in step with the code except these checks. They fail when a segment
// is added, a command renamed or a format changed, and when a link would break
// once Pages serves the page under /ccbrief/.
const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../site/style.css', import.meta.url), 'utf8')

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Matched as <code>id</code>, not a bare substring: ids like `pr` or `model`
// also turn up in ordinary prose and would pass without being documented.
test('every segment in the catalog is documented on the site', () => {
  for (const seg of SEGMENTS) {
    assert.ok(html.includes(`<code>${seg.id}</code>`), `site is missing segment: ${seg.id}`)
  }
})

test('both named presets are documented', () => {
  for (const name of ['standard', 'detailed']) {
    assert.ok(html.includes(`<code>${name}</code>`), `site is missing preset: ${name}`)
  }
})

test('the install, config and uninstall commands appear', () => {
  for (const cmd of ['npx ccbrief init', 'npx ccbrief config', 'npx ccbrief uninstall']) {
    assert.ok(html.includes(cmd), `site is missing command: ${cmd}`)
  }
})

// Same guarantee as the README test in fixtures.test.js: the example on the
// page is the renderer's real output. Escaped so a segment that ever emits
// `<` or `&` still matches the HTML source.
test('the detailed example line is the real render of the demo fixture', () => {
  const line = render(fx.demo, loadConfig({ preset: 'detailed', colors: false }), { columns: 200 })
  assert.ok(html.includes(escapeHtml(line)), `site no longer contains the rendered detailed line:\n${line}`)
})

test('the Anthropic disclaimer is kept', () => {
  assert.ok(html.includes('Not affiliated with, or endorsed by, Anthropic.'))
})

// A project site lives under /ccbrief/, so `/assets/x.png` resolves to the
// domain root and 404s. Relative paths only (this also rejects `//host`).
test('no root-absolute paths in the page or stylesheet', () => {
  assert.doesNotMatch(html, /(?:src|href)="\//)
  assert.doesNotMatch(css, /url\(\s*['"]?\//)
})

test('every in-page link has a target', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])
  assert.ok(anchors.length > 0)
  for (const a of anchors) assert.ok(ids.has(a), `href="#${a}" has no matching id`)
})

// Search engines read the page through its <head>. One canonical URL, and
// nothing that tells a crawler to stay away.
const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1]

test('the page has a canonical URL and is not marked noindex', () => {
  assert.equal(canonical, 'https://shehab267.github.io/ccbrief/')
  assert.doesNotMatch(html, /noindex/i)
})

// A typo in hand-written JSON-LD fails silently: search engines just drop it.
// Ratings and reviews are left out on purpose: there are none, and inventing
// them would break the project's rule against fake values.
test('the structured data parses and points at the canonical URL', () => {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  assert.ok(block, 'site is missing its JSON-LD block')
  const data = JSON.parse(block[1])
  assert.equal(data['@type'], 'SoftwareApplication')
  assert.equal(data.name, 'ccbrief')
  assert.equal(data.url, canonical)
  assert.equal(data.aggregateRating, undefined)
  assert.equal(data.review, undefined)
})

// npm shows `homepage` as the package's website link, so it has to be the
// same address the page calls canonical.
test('package.json homepage is the canonical URL', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.homepage, canonical)
})

// A project page can't point to its sitemap from robots.txt (only the domain
// root's robots.txt is read, and that belongs to another repo), so it is
// submitted by hand in Search Console. No <lastmod>: a hand-kept date goes
// stale, and search engines ignore one they learn not to trust.
test('the sitemap lists exactly the canonical URL', () => {
  const sitemap = readFileSync(new URL('../site/sitemap.xml', import.meta.url), 'utf8')
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  assert.deepEqual(locs, [canonical])
})

// Every local file the page or stylesheet points at must exist once deployed.
// The Pages workflow publishes site/ as is and copies assets/ in beside it, so
// `assets/x` resolves against the repo's assets/ and everything else against site/.
test('every local file the site links to exists', () => {
  const refs = [
    ...[...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]),
    ...[...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]),
  ].filter((r) => !r.startsWith('data:'))
  assert.ok(refs.length > 0)
  for (const ref of refs) {
    const file = ref.startsWith('assets/') ? new URL(`../${ref}`, import.meta.url) : new URL(`../site/${ref}`, import.meta.url)
    assert.ok(existsSync(file), `site links to a missing file: ${ref}`)
  }
})
