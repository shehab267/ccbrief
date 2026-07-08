// `ccbrief init` orchestration. Impure (touches the filesystem), but every edge
// is an injectable seam (copyRenderer, confirm, log, now) so the flow is fully
// tested against throwaway temp dirs.
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { commandString } from '../paths.js'
import { hasStatusLine, patchSettings, backupName } from '../installer.js'
import { DEFAULT_CONFIG, refreshIntervalFor, loadConfig } from '../config.js'
import { render } from '../render.js'

// Fixed dummy data for the install preview — never real repo/session info.
const PREVIEW_INPUT = {
  now: 0, workspace: { current_dir: '/home/dev/ccbrief', repo: { name: 'ccbrief' } },
  git: { branch: 'main', added: 3, removed: 1 }, model: { display_name: 'Opus' },
  context_window: { used_percentage: 42 }, cost: { total_duration_ms: 5_040_000 },
}

const bundledRenderer = () => join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist', 'statusline.js')

export async function runInit({ dir, copyRenderer, confirm, log, now = Date.now }) {
  const settingsPath = join(dir, 'settings.json')
  const ccbrief = join(dir, 'ccbrief')

  let existing = {}
  if (existsSync(settingsPath)) {
    try { existing = JSON.parse(readFileSync(settingsPath, 'utf8')) } catch { existing = {} }
    if (hasStatusLine(existing)) {
      const ok = await confirm(existing.statusLine)
      if (!ok) { log('Aborted — existing statusLine kept.'); return { changed: false, backup: null } }
    }
    // Back up the original (timestamped so re-runs don't spam a single .bak).
    writeFileSync(join(dir, backupName(now())), readFileSync(settingsPath, 'utf8'))
  }

  mkdirSync(ccbrief, { recursive: true })
  writeFileSync(join(ccbrief, 'config.json'), JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n')

  // Copy the bundled, self-contained renderer (seam lets tests skip the real dist).
  if (copyRenderer) copyRenderer(ccbrief)
  else copyFileSync(bundledRenderer(), join(ccbrief, 'statusline.js'))

  const config = loadConfig(DEFAULT_CONFIG)
  const command = commandString(ccbrief)
  const refreshInterval = refreshIntervalFor(config)
  writeFileSync(settingsPath, JSON.stringify(patchSettings(existing, { command, refreshInterval }), null, 2) + '\n')

  log('Preview: ' + render(PREVIEW_INPUT, config, { columns: 80 }))
  return { changed: true, backup: null }
}
