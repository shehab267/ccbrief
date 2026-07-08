// `ccbrief uninstall`. Prefer restoring the most recent settings backup; if none
// survives, strip only our statusLine block and leave every other key intact.
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export async function runUninstall({ dir, removeDir = false, log = () => {} }) {
  const settingsPath = join(dir, 'settings.json')
  const backups = readdirSync(dir)
    .filter((f) => f.startsWith('settings.json.bak.'))
    .sort((a, b) => Number(b.split('.').pop()) - Number(a.split('.').pop()))

  let restored = false
  let removedBlock = false

  if (backups.length > 0) {
    writeFileSync(settingsPath, readFileSync(join(dir, backups[0]), 'utf8'))
    restored = true
    log(`Restored ${backups[0]}`)
  } else if (existsSync(settingsPath)) {
    // No backup to restore: strip only our block. A malformed settings.json is
    // not ours to rewrite — log and leave it untouched rather than crash.
    let settings
    try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')) } catch {
      log('settings.json is unreadable — left untouched (no backup to restore).')
      return { restored, removedBlock }
    }
    delete settings.statusLine
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
    removedBlock = true
    log('Removed statusLine block')
  }

  if (removeDir) rmSync(join(dir, 'ccbrief'), { recursive: true, force: true })
  return { restored, removedBlock }
}
