// Pure settings-patch helpers. All file I/O lives in the command modules
// (src/commands/*.js) so these are trivially testable and idempotent.

export function hasStatusLine(settings) {
  return Boolean(settings && settings.statusLine)
}

// Merge our statusLine at the top level, never clobbering hooks / permissions /
// enabledPlugins / any other key. Idempotent: patch∘patch === patch.
export function patchSettings(existing, { command, refreshInterval } = {}) {
  const next = { ...(existing && typeof existing === 'object' ? existing : {}) }
  const statusLine = { type: 'command', command }
  if (refreshInterval != null) statusLine.refreshInterval = refreshInterval
  next.statusLine = statusLine
  return next
}

export function backupName(now) {
  return `settings.json.bak.${now}`
}

// Does this settings object's statusLine point at ccbrief's own renderer?
// Lets `init` avoid backing up our own install on re-run (so the pristine
// pre-ccbrief backup survives) and lets `uninstall` strip a residual block
// from a backup that an older, buggy init captured.
export function ownsStatusLine(settings, ccbriefDir) {
  const cmd = settings?.statusLine?.command
  if (typeof cmd !== 'string') return false
  return cmd.includes(String(ccbriefDir).replace(/\\/g, '/') + '/statusline.js')
}
