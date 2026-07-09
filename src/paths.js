// Cross-platform path resolution for the config dir and the statusLine command.
//
// `configDir`/`ccbriefDir` take `platform` explicitly and pick path.win32 vs
// path.posix accordingly, so they're deterministic regardless of the host OS
// (the CI matrix runs these on Linux, macOS, AND Windows). The host default
// `process.platform` is used for real file reads in `readConfigFile`.
import path from 'node:path'
import { readFileSync } from 'node:fs'

const joinFor = (platform) => (platform === 'win32' ? path.win32.join : path.posix.join)

export function configDir(env = process.env, platform = process.platform) {
  if (env.CLAUDE_CONFIG_DIR) return env.CLAUDE_CONFIG_DIR
  const home = platform === 'win32' ? env.USERPROFILE : env.HOME
  return joinFor(platform)(home ?? '', '.claude')
}

export function ccbriefDir(env = process.env, platform = process.platform) {
  return joinFor(platform)(configDir(env, platform), 'ccbrief')
}

export function commandString(dir) {
  // CC runs statusLine.command through a shell, so a path containing spaces
  // (Windows `C:\Users\John Doe`, macOS "Application Support") must be quoted.
  // Forward-slash it so the same command string works in sh, cmd, and PowerShell.
  const fwd = String(dir).replace(/\\/g, '/')
  return `node "${fwd}/statusline.js"`
}

export function readConfigFile(env = process.env, platform = process.platform) {
  try {
    return JSON.parse(readFileSync(joinFor(platform)(ccbriefDir(env, platform), 'config.json'), 'utf8'))
  } catch {
    return null // missing/malformed → defaults; never throw
  }
}
