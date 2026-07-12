// Core segments. Each segment is a pure { id, title, section, isAvailable, format }
// object. `title` is the segment's name in plain words — the `id` is a config key
// (terse, stable, camelCase), and a config key is a poor thing to ask someone to
// read in a picker. The picker shows both, so the word teaches and the id is still
// the thing you'd type into config.json.
import { clean } from '../format.js'
import { optionDefaults } from './options.js'
const basename = (p) => String(p ?? '').split(/[\\/]/).filter(Boolean).pop() ?? ''
// Default visibility of the repo diff, from the single source of truth (options.js)
// so it can't drift from what withOptions writes into the config entry.
const REPO_DEFAULTS = optionDefaults('repo')

// Each field wears its own hue, so the eye finds "where am I" by colour rather
// than by counting separators. Cyan for the two "which environment" fields —
// directory and model — bold on the model to separate the pair without reaching
// for a bright slot.
export const directory = {
  id: 'directory',
  title: 'current folder',
  section: 'core',
  isAvailable: (input) => Boolean(input?.workspace?.current_dir),
  format: (input, theme) => theme.color('cyan', clean(basename(input.workspace.current_dir))),
}

export const model = {
  id: 'model',
  title: 'model',
  section: 'core',
  isAvailable: (input) => Boolean(input?.model?.display_name),
  format: (input, theme) => {
    return `${theme.icon('model')}${theme.color('cyanBold', clean(input.model.display_name))}`
  },
}

export const repo = {
  id: 'repo',
  title: 'repository / branch',
  section: 'core',
  isAvailable: (input) => Boolean(input?.git),
  format: (input, theme, entry) => {
    const name = clean(input.workspace?.repo?.name ?? basename(input.workspace?.current_dir))
    const branch = clean(input.git.branch)
    // Green symbol, plain-foreground name: the branch is the one field that is
    // pure identity, so it reads at the default foreground while its marker
    // carries the colour.
    const head = `${theme.icon('branch', 'green')}${theme.primary(`${name}/${branch}`)}`
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
  title: 'context used',
  section: 'core',
  // Only when used_percentage is a real number: null early in a session and
  // post-/compact → hide, never render a fabricated 0%. (0 itself is valid.)
  isAvailable: (input) => input?.context_window?.used_percentage != null,
  format: (input, theme) => {
    const pct = Math.round(input.context_window.used_percentage)
    // The number and the bar carry DIFFERENT things. The number is flat magenta —
    // it is the context field's identity hue, and it stays put so the eye can
    // find it. The bar alone ramps green → yellow → red with the fill, because
    // the bar is the part that means "how full". Colouring both by the threshold
    // (as this once did) says the same thing twice and leaves the segment with no
    // stable colour to recognise it by.
    const tone = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green'
    return `${theme.color('magenta', `${pct}%`)} ${theme.bar(pct, 9, tone)}`
  },
}
