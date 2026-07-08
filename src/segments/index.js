// Segment registry: the ordered catalog plus id- and section-based lookups.
// New segments are inserted into SEGMENTS in display order.
import { directory, repo, context, model } from './core.js'
import { tokens, remaining, duration, cost, fiveHour, weekly } from './usage.js'

export const SEGMENTS = [directory, repo, context, model, tokens, remaining, duration, cost, fiveHour, weekly]

export const BY_ID = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]))

export const SECTIONS = {
  core: SEGMENTS.filter((s) => s.section === 'core'),
  usage: SEGMENTS.filter((s) => s.section === 'usage'),
  development: SEGMENTS.filter((s) => s.section === 'development'),
  claude: SEGMENTS.filter((s) => s.section === 'claude'),
}
