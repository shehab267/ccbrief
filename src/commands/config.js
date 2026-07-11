// `ccbrief config` orchestration. The TUI owns config.json; this module owns the
// consequence of a save — settings.json.
//
// Why it exists: refreshInterval is derived from the segment list (a time-based
// segment needs 60s polling, everything else is event-driven). The TUI only wrote
// config.json, so toggling `fiveHour` off left the status line polling forever, and
// toggling it on left it frozen — until the next `init`. Saving now re-syncs both.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { commandString } from '../paths.js'
import { patchSettings, ownsStatusLine } from '../installer.js'
import { refreshIntervalFor } from '../config.js'
import { runConfigTui } from '../tui/index.js'

// Re-derive settings.json's statusLine from `config`. Deliberately a no-op unless the
// statusLine is already ours: `config` is not an installer, so it must never write
// itself over a statusLine the user set up (that is `init`'s job, and it asks first).
export function syncSettings({ dir, config }) {
  const settingsPath = join(dir, 'settings.json')
  const ccbrief = join(dir, 'ccbrief')
  if (!existsSync(settingsPath)) return { synced: false }

  let settings
  try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')) } catch { return { synced: false } }
  if (!ownsStatusLine(settings, ccbrief)) return { synced: false }

  const refreshInterval = refreshIntervalFor(config)
  const next = patchSettings(settings, { command: commandString(ccbrief), refreshInterval })
  writeFileSync(settingsPath, JSON.stringify(next, null, 2) + '\n')
  return { synced: true, refreshInterval }
}

// `tui` is a seam so the orchestration is testable without a terminal. It resolves
// with the saved config, or undefined if the user quit with esc/q — in which case
// nothing was saved and there is nothing to sync.
export async function runConfig({ dir, initialConfig, tui = runConfigTui }) {
  const config = await tui({ dir: join(dir, 'ccbrief'), initialConfig })
  if (!config) return { saved: false, synced: false }
  return { saved: true, ...syncSettings({ dir, config }) }
}
