// Core segments. Each segment is a pure { id, section, isAvailable, format } object.
// `repo` (Task 5) and `context` (Task 6) are appended to this file as they land.
const basename = (p) => String(p ?? '').split(/[\\/]/).filter(Boolean).pop() ?? ''

export const directory = {
  id: 'directory',
  section: 'core',
  isAvailable: (input) => Boolean(input?.workspace?.current_dir),
  format: (input) => basename(input.workspace.current_dir),
}

export const model = {
  id: 'model',
  section: 'core',
  isAvailable: (input) => Boolean(input?.model?.display_name),
  format: (input) => input.model.display_name,
}

export const repo = {
  id: 'repo',
  section: 'core',
  isAvailable: (input) => Boolean(input?.git),
  format: (input, theme) => {
    const name = input.workspace?.repo?.name ?? basename(input.workspace?.current_dir)
    const { branch, added, removed } = input.git
    const glyph = theme.glyph('branch')
    const head = `${glyph ? glyph + ' ' : ''}${name}/${branch}`
    if (!added && !removed) return head
    return `${head} ${theme.color('green', `+${added}`)}/${theme.color('red', `-${removed}`)}`
  },
}

export const context = {
  id: 'context',
  section: 'core',
  // Only when used_percentage is a real number: null early in a session and
  // post-/compact → hide, never render a fabricated 0%. (0 itself is valid.)
  isAvailable: (input) => input?.context_window?.used_percentage != null,
  format: (input, theme) => {
    const pct = Math.round(input.context_window.used_percentage)
    const tone = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green'
    return `${theme.color(tone, `${pct}%`)} ${theme.bar(pct)}`
  },
}
