// Core segments. Each segment is a pure { id, section, isAvailable, format } object.
// `repo` (Task 5) and `context` (Task 6) are appended to this file as they land.
import { clean } from '../format.js'
import { optionDefaults } from './options.js'
const basename = (p) => String(p ?? '').split(/[\\/]/).filter(Boolean).pop() ?? ''
// Default visibility of the repo diff, from the single source of truth (options.js)
// so it can't drift from what withOptions writes into the config entry.
const REPO_DEFAULTS = optionDefaults('repo')

export const directory = {
  id: 'directory',
  section: 'core',
  isAvailable: (input) => Boolean(input?.workspace?.current_dir),
  format: (input, theme) => theme.primary(clean(basename(input.workspace.current_dir))),
}

export const model = {
  id: 'model',
  section: 'core',
  isAvailable: (input) => Boolean(input?.model?.display_name),
  format: (input, theme) => {
    const glyph = theme.glyph('model')
    return `${glyph ? glyph + ' ' : ''}${theme.primary(clean(input.model.display_name))}`
  },
}

export const repo = {
  id: 'repo',
  section: 'core',
  isAvailable: (input) => Boolean(input?.git),
  format: (input, theme, entry) => {
    const name = clean(input.workspace?.repo?.name ?? basename(input.workspace?.current_dir))
    const branch = clean(input.git.branch)
    const glyph = theme.glyph('branch')
    const head = `${glyph ? glyph + ' ' : ''}${theme.primary(`${name}/${branch}`)}`
    // `+N/-M` is the git working-tree diff vs HEAD. Independently toggleable
    // (showDiff) so the branch can stand alone; still hidden when the tree is clean.
    const showDiff = entry?.showDiff ?? REPO_DEFAULTS.showDiff
    const { added, removed } = input.git
    if (!showDiff || (!added && !removed)) return head
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
    // Same tone drives the number AND the bar fill so the whole segment reads
    // as one gauge: green plenty → yellow filling → red nearly full.
    const tone = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green'
    return `${theme.color(tone, `${pct}%`)} ${theme.bar(pct, 9, tone)}`
  },
}
