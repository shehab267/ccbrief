// Segment registry: the ordered catalog plus id- and section-based lookups.
// New segments are inserted into SEGMENTS in display order.
import { directory, repo, context, model } from './core.js'
import { tokens, cost, fiveHour, weekly } from './usage.js'
export { SEGMENT_OPTIONS, optionsFor, optionDefaults } from './options.js'
import { lines, pr, worktree } from './development.js'
import { effort, thinking, outputStyle, agent } from './claude.js'

// SEGMENTS is the catalog, and the catalog is now the WHOLE menu: the config picker
// lists every entry here, so this order is the order a user scrolls through. Anything
// absent from this list is unreachable — which is exactly why nothing lives outside it.
export const SEGMENTS = [
  directory, repo, context, model,
  tokens, cost, fiveHour, weekly,
  lines, pr, worktree,
  effort, thinking, outputStyle, agent,
]

export const BY_ID = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]))

export const SECTIONS = {
  core: SEGMENTS.filter((s) => s.section === 'core'),
  usage: SEGMENTS.filter((s) => s.section === 'usage'),
  development: SEGMENTS.filter((s) => s.section === 'development'),
  claude: SEGMENTS.filter((s) => s.section === 'claude'),
}
