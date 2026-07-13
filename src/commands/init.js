// `ccbrief init` orchestration. Impure (touches the filesystem), but every edge
// is an injectable seam (copyRenderer, confirm, log, now) so the flow is fully
// tested against throwaway temp dirs.
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { commandString } from '../paths.js'
import { hasStatusLine, patchSettings, backupName, ownsStatusLine } from '../installer.js'
import { DEFAULT_CONFIG, refreshIntervalFor, loadConfig } from '../config.js'
import { render } from '../render.js'
import { PREVIEW_INPUT } from '../preview.js'

const bundledRenderer = () => join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist', 'statusline.js')

// What `init` says when it's done. It used to say `Preview: <line>` and stop, which
// left the one question a first-time user actually has — "…and now what?" — for them
// to answer alone. So the installer now ends by naming the next step.
//
// "No restart needed" is the documented behaviour, not a guess: Claude Code reloads
// settings automatically, and the new status line shows up on the next interaction
// (docs.claude.com → statusline). Saying "restart Claude Code" would be folklore.
//
// Plain text, no ANSI: this goes through console.log into terminals we don't control
// (and into CI logs), and a next-steps message is the last place worth risking mojibake.
//
// Pure — the caller supplies the rendered preview and the path — so the wording is
// unit-testable without touching a filesystem.
export function nextSteps({ preview, configPath, fresh = true }) {
  return [
    '',
    fresh ? '  ✔ ccbrief installed' : '  ✔ ccbrief updated — your existing configuration was kept',
    '',
    '  Preview (sample data)',
    `    ${preview}`,
    '',
    '  Your status line is live. It appears on your next interaction with Claude Code —',
    '  no restart needed.',
    '',
    '  What to do next',
    '    npx ccbrief config      choose what it shows, with a live preview',
    '',
    `  Config file: ${configPath}`,
    '',
  ].join('\n')
}

export async function runInit({ dir, copyRenderer, confirm, log, now = Date.now }) {
  const settingsPath = join(dir, 'settings.json')
  const ccbrief = join(dir, 'ccbrief')

  let existing = {}
  if (existsSync(settingsPath)) {
    try { existing = JSON.parse(readFileSync(settingsPath, 'utf8')) } catch { existing = {} }
    const ours = ownsStatusLine(existing, ccbrief)
    // Only prompt before replacing a statusLine we don't own (re-running over our
    // own install is an idempotent update, not a clobber).
    if (hasStatusLine(existing) && !ours) {
      const ok = await confirm(existing.statusLine)
      if (!ok) { log('Aborted — existing statusLine kept.'); return { changed: false, backup: null } }
    }
    // Back up only settings we don't own: a re-run must not overwrite the pristine
    // pre-ccbrief backup with our own install (which would defeat uninstall).
    if (!ours) writeFileSync(join(dir, backupName(now())), readFileSync(settingsPath, 'utf8'))
  }

  mkdirSync(ccbrief, { recursive: true })

  // Re-running init is an idempotent repair (relink the renderer, re-patch settings),
  // not a factory reset: keep a config the user has already tuned. A config that is
  // missing, unparseable, or not a JSON object (`[]`, `42`, `null`) is not something
  // to preserve — init is the repair command, so it rewrites those with the defaults.
  const configPath = join(ccbrief, 'config.json')
  let saved = null
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8'))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed
    } catch { saved = null }
  }
  if (!saved) writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n')

  // Copy the bundled, self-contained renderer (seam lets tests skip the real dist).
  if (copyRenderer) copyRenderer(ccbrief)
  else copyFileSync(bundledRenderer(), join(ccbrief, 'statusline.js'))

  // Mark the install dir as ESM. Without it node has no package.json context for
  // the bundle, logs MODULE_TYPELESS_PACKAGE_JSON, and reparses it as ESM on every
  // spawn (an every-render cost). This pins it so the reparse never happens.
  writeFileSync(join(ccbrief, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n')

  // refreshInterval must describe the config we actually kept, not the defaults.
  const config = loadConfig(saved ?? DEFAULT_CONFIG)
  const command = commandString(ccbrief)
  const refreshInterval = refreshIntervalFor(config)
  writeFileSync(settingsPath, JSON.stringify(patchSettings(existing, { command, refreshInterval }), null, 2) + '\n')

  log(nextSteps({
    preview: render(PREVIEW_INPUT, config, { columns: 80 }),
    configPath,
    fresh: !saved, // a kept config means this run was an update, not a first install
  }))
  return { changed: true, backup: null }
}
