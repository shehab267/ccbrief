#!/usr/bin/env node
// ccbrief CLI — init / config / uninstall.
import { createInterface } from 'node:readline/promises'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInit } from '../src/commands/init.js'
import { runUninstall, isInstalled } from '../src/commands/uninstall.js'
import { runConfig } from '../src/commands/config.js'
import { configDir, readConfigFile } from '../src/paths.js'

const [cmd] = process.argv.slice(2)

// The one source of truth for the version is package.json — a hardcoded string
// here silently drifts the moment it's bumped. Read, not imported: the CLI isn't
// bundled, and a plain read needs no JSON-import attribute.
const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'))

// "the interactive configuration TUI" is gone. TUI is the exact kind of word this
// tool decided not to use — it names an implementation, not a thing you can want.
const HELP = `ccbrief v${version} — a minimal, configurable status line for Claude Code

usage:
  ccbrief init        install the status line and switch it on
  ccbrief config      choose what it shows, with a live preview
  ccbrief uninstall   remove it and put your settings back

  ccbrief --version   print the version
  ccbrief --help      print this`

// Prompt before replacing a statusLine block the user already configured.
async function confirmReplace(existing) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`A statusLine already exists:\n  ${existing.command}\nReplace it? [y/N] `)
  rl.close()
  return /^y(es)?$/i.test(answer.trim())
}

const ask = async (question) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(question)
  rl.close()
  return /^y(es)?$/i.test(answer.trim())
}

const log = (m) => console.log(m)

switch (cmd) {
  case 'init':
    await runInit({ dir: configDir(), confirm: confirmReplace, log })
    break

  case 'uninstall': {
    const dir = configDir()
    // Say what this will do BEFORE asking anything. It used to open with its scariest
    // question ("Also remove the ccbrief/ renderer directory?") before the user had
    // been told that their settings.json gets restored either way.
    if (!isInstalled(dir)) {
      console.log('ccbrief was not installed here — nothing to undo.')
      break
    }
    console.log('This restores your previous settings.json and takes the ccbrief status line off.')
    const removeDir = await ask(`Also delete the renderer folder (${join(dir, 'ccbrief')})? [y/N] `)
    await runUninstall({ dir, removeDir, log })
    break
  }

  case 'config': {
    // Saving re-syncs settings.json too, so a segment change takes effect immediately.
    // `log` is what finally makes a save visible — see configOutcome().
    await runConfig({ dir: configDir(), initialConfig: readConfigFile(), log })
    break
  }

  case '--version':
  case '-v':
    console.log(version)
    break

  case '--help':
  case '-h':
  case 'help':
  case undefined: // bare `ccbrief` — asking for nothing is not an error
    console.log(HELP)
    break

  // A typo used to print the help and exit 0, so `ccbrief instal` looked like it had
  // worked and scripts calling it saw success. Unknown commands go to stderr and exit
  // non-zero, which is the only thing a caller can actually check.
  default:
    console.error(`ccbrief: unknown command "${cmd}"\n`)
    console.error(HELP)
    process.exit(1)
}
