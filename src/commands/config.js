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
import { render } from '../render.js'
import { PREVIEW_INPUT } from '../preview.js'

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

// What `config` says on the way out — and it now says SOMETHING, always.
//
// Saving used to print nothing: the picker cleared, the shell prompt came back, and a
// save looked exactly like a discard. Worse, `config` writes config.json happily even
// when ccbrief was never installed (`synced: false`) — so you could sit there tuning a
// status line that was never going to appear, and be told nothing. That case gets the
// command that fixes it, by name.
//
// Pure — the caller supplies the rendered preview and the path — so the wording is
// unit-testable without a filesystem. Plain text, no ANSI, same as `init`'s message.
export function configOutcome({ saved, synced, preview, configPath }) {
  if (!saved) return '\n  Closed — nothing was saved.\n'
  return [
    '',
    '  ✔ Saved',
    '',
    '  Preview (sample data)',
    `    ${preview}`,
    '',
    synced
      ? '  Your status line is updated. It appears on your next interaction with\n  Claude Code — no restart needed.'
      : "  ccbrief isn't installed yet, so there's no status line for this to drive.\n  Run `npx ccbrief init` to switch it on — it keeps the choices you just made.",
    '',
    `  Config file: ${configPath}`,
    '',
  ].join('\n')
}

// `tui` and `log` are seams so the orchestration is testable without a terminal. The
// TUI resolves with the saved config, or undefined if the user quit with esc/q — in
// which case nothing was saved and there is nothing to sync.
export async function runConfig({ dir, initialConfig, tui = runConfigTui, log = () => {} }) {
  const config = await tui({ dir: join(dir, 'ccbrief'), initialConfig })
  if (!config) {
    log(configOutcome({ saved: false }))
    return { saved: false, synced: false }
  }
  const sync = syncSettings({ dir, config })
  log(configOutcome({
    saved: true,
    synced: sync.synced,
    preview: render(PREVIEW_INPUT, config, { columns: 80 }),
    configPath: join(dir, 'ccbrief', 'config.json'),
  }))
  return { saved: true, ...sync, config }
}
