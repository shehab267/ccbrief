// `ccbrief uninstall`. Prefer restoring the most recent settings backup; if none
// survives, strip only our statusLine block and leave every other key intact.
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ownsStatusLine } from '../installer.js'

// Every backup `init` left behind, newest first. The config dir may not exist at all —
// a fresh machine, a custom CLAUDE_CONFIG_DIR, a folder deleted by hand — and an
// unguarded readdirSync there threw ENOENT and took the whole command down with a raw
// Node stack trace. Uninstall is the LAST thing a user sees; it does not get to crash.
function backupsIn(dir) {
  if (!existsSync(dir)) return []
  try {
    return readdirSync(dir)
      .filter((f) => f.startsWith('settings.json.bak.'))
      .sort((a, b) => Number(b.split('.').pop()) - Number(a.split('.').pop()))
  } catch {
    return [] // unreadable dir → nothing to restore from, but still not a crash
  }
}

// True when there is anything here to undo. The CLI asks this BEFORE prompting, so a
// user with nothing installed is never asked whether to delete a directory that isn't
// there.
export function isInstalled(dir) {
  return existsSync(join(dir, 'ccbrief')) || backupsIn(dir).length > 0 ||
    (existsSync(join(dir, 'settings.json')) && ownsStatusLineAt(dir))
}

function ownsStatusLineAt(dir) {
  try {
    const settings = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
    return ownsStatusLine(settings, join(dir, 'ccbrief'))
  } catch {
    return false
  }
}

export async function runUninstall({ dir, removeDir = false, log = () => {} }) {
  const settingsPath = join(dir, 'settings.json')
  const ccbriefDir = join(dir, 'ccbrief')
  const backups = backupsIn(dir)

  let restored = false
  let removedBlock = false

  if (backups.length > 0) {
    const content = readFileSync(join(dir, backups[0]), 'utf8')
    writeFileSync(settingsPath, content)
    restored = true
    log(`Restored your previous settings.json (from ${backups[0]}).`)
    // A backup captured by an older, buggy init may still carry our own block —
    // strip it so restore actually removes ccbrief.
    try {
      const s = JSON.parse(content)
      if (ownsStatusLine(s, ccbriefDir)) {
        delete s.statusLine
        writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n')
        removedBlock = true
        log('Removed the leftover ccbrief statusLine from that backup.')
      }
    } catch { /* restored content not JSON → leave as-is */ }
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
    log('Removed the ccbrief statusLine from settings.json.')
  }

  if (removeDir && existsSync(ccbriefDir)) {
    rmSync(ccbriefDir, { recursive: true, force: true })
    log(`Deleted ${ccbriefDir}`)
  }

  // Silence used to be the answer when there was nothing to do, which reads as a
  // command that failed quietly. Say it plainly instead.
  if (!restored && !removedBlock && !removeDir) log('ccbrief was not installed here — nothing to undo.')
  else log('ccbrief has been removed.')

  return { restored, removedBlock }
}
