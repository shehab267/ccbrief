// Development segments: session line diff, PR status (clickable via OSC 8), and
// the active git worktree. Each hides when its source is absent.
import { clean } from '../format.js'
const basename = (p) => String(p ?? '').split(/[\\/]/).filter(Boolean).pop() ?? ''
// OSC 8 hyperlink: the URL is invisible; only the link text takes columns.
const osc8 = (url, text) => `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`

export const lines = {
  id: 'lines', section: 'development',
  isAvailable: (input) => input?.cost?.total_lines_added != null || input?.cost?.total_lines_removed != null,
  // Session edits, not the working tree. The pencil glyph keeps this apart from
  // the repo segment's `+N/-M` (git diff vs HEAD), which is otherwise identical.
  format: (input, theme) => {
    const a = input.cost.total_lines_added ?? 0
    const d = input.cost.total_lines_removed ?? 0
    const glyph = theme.glyph('lines')
    return `${glyph ? glyph + ' ' : ''}${theme.color('green', `+${a}`)}/${theme.color('red', `-${d}`)}`
  },
}

export const pr = {
  id: 'pr', section: 'development',
  isAvailable: (input) => input?.pr?.number != null,
  format: (input, theme) => {
    const text = theme.primary(`${theme.glyph('pr') ? theme.glyph('pr') + ' ' : ''}#${clean(input.pr.number)} ${clean(input.pr.review_state ?? '')}`.trim())
    // Only wrap a real web URL in OSC 8 — never an arbitrary (e.g. javascript:) scheme.
    const url = clean(input.pr.url ?? '')
    return /^https?:\/\//i.test(url) ? osc8(url, text) : text
  },
}

export const worktree = {
  id: 'worktree', section: 'development',
  isAvailable: (input) => Boolean(input?.workspace?.git_worktree || input?.worktree?.path),
  format: (input, theme) => {
    const p = input.workspace?.git_worktree || input.worktree?.path
    return `${theme.glyph('worktree') ? theme.glyph('worktree') + ' ' : ''}${theme.primary(clean(basename(p)))}`
  },
}
