#!/usr/bin/env node
// ccbrief CLI — init / config / uninstall.
// Scaffold stub: command implementations land in later milestones.

const [cmd] = process.argv.slice(2)

const HELP = `ccbrief — a minimal, configurable status line for Claude Code

usage:
  ccbrief init        install and wire up the status line
  ccbrief config      open the interactive configuration TUI
  ccbrief uninstall   remove the status line and restore settings

  ccbrief --version   print version

(v0.1.0 — under development)`

switch (cmd) {
  case 'init':
  case 'config':
  case 'uninstall':
    console.log(`ccbrief: "${cmd}" is not implemented yet.`)
    break
  case '--version':
  case '-v':
    console.log('0.1.0')
    break
  default:
    console.log(HELP)
}
