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
