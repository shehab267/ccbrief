// Development segments: session line diff, PR status (clickable via OSC 8), and
// the active git worktree. Each hides when its source is absent.
import { clean } from '../format.js'
const basename = (p) => String(p ?? '').split(/[\\/]/).filter(Boolean).pop() ?? ''
// OSC 8 hyperlink: the URL is invisible; only the link text takes columns.
const osc8 = (url, text) => `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`

export const lines = {
  id: 'lines', title: 'lines changed', section: 'development',
  isAvailable: (input) => input?.cost?.total_lines_added != null || input?.cost?.total_lines_removed != null,
  // Session edits (cumulative lines Claude added/removed this session), not the
  // working tree. Rendered as a bare +/- with no icon.
  format: (input, theme) => {
    const a = input.cost.total_lines_added ?? 0
    const d = input.cost.total_lines_removed ?? 0
    return `${theme.color('green', `+${a}`)}/${theme.color('red', `-${d}`)}`
  },
}

export const pr = {
  id: 'pr', title: 'pull request', section: 'development',
  isAvailable: (input) => input?.pr?.number != null,
  format: (input, theme) => {
    const text = theme.primary(`${theme.icon('pr')}#${clean(input.pr.number)} ${clean(input.pr.review_state ?? '')}`.trim())
    // Only wrap a real web URL in OSC 8 — never an arbitrary (e.g. javascript:) scheme.
    const url = clean(input.pr.url ?? '')
    return /^https?:\/\//i.test(url) ? osc8(url, text) : text
  },
}

export const worktree = {
  id: 'worktree', title: 'git worktree', section: 'development',
  isAvailable: (input) => Boolean(input?.workspace?.git_worktree || input?.worktree?.path),
  format: (input, theme) => {
    const p = input.workspace?.git_worktree || input.worktree?.path
    return `${theme.icon('worktree')}${theme.primary(clean(basename(p)))}`
  },
}
