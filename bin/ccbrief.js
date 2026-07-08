#!/usr/bin/env node
// ccbrief CLI — init / config / uninstall.
import { createInterface } from 'node:readline/promises'
import { runInit } from '../src/commands/init.js'
import { runUninstall } from '../src/commands/uninstall.js'
import { configDir } from '../src/paths.js'

const [cmd] = process.argv.slice(2)

const HELP = `ccbrief — a minimal, configurable status line for Claude Code

usage:
  ccbrief init        install and wire up the status line
  ccbrief config      open the interactive configuration TUI
  ccbrief uninstall   remove the status line and restore settings

  ccbrief --version   print version

(v0.1.0 — under development)`

// Prompt before replacing a statusLine block the user already configured.
async function confirmReplace(existing) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`A statusLine already exists:\n  ${existing.command}\nReplace it? [y/N] `)
  rl.close()
  return /^y(es)?$/i.test(answer.trim())
}

switch (cmd) {
  case 'init':
    await runInit({ dir: configDir(), confirm: confirmReplace, log: (m) => console.log(m) })
    break
  case 'uninstall': {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = await rl.question('Also remove the ccbrief/ renderer directory? [y/N] ')
    rl.close()
    const removeDir = /^y(es)?$/i.test(answer.trim())
    await runUninstall({ dir: configDir(), removeDir, log: (m) => console.log(m) })
    break
  }
  case 'config':
    console.log(`ccbrief: "${cmd}" is not implemented yet.`)
    break
  case '--version':
  case '-v':
    console.log('0.1.0')
    break
  default:
    console.log(HELP)
}
