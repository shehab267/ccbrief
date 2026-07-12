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

// Claude Code reports a worktree two different ways, and which one you get depends
// on how you entered it: a `--worktree` session carries the full `worktree` object
// (name, path, branch), while plain `git worktree add` only sets the string
// `workspace.git_worktree`. Read the richest source first and fall back — otherwise
// the segment works in one kind of worktree and silently hides in the other.
// basename() over the lot: `worktree.name` and `workspace.git_worktree` are already
// bare names, `worktree.path` is a full path, and basename leaves the first two alone.
const worktreeName = (input) =>
  basename(input?.worktree?.name || input?.worktree?.path || input?.workspace?.git_worktree || '')

export const worktree = {
  id: 'worktree', title: 'git worktree', section: 'development',
  isAvailable: (input) => Boolean(worktreeName(input)),
  format: (input, theme) => `${theme.icon('worktree')}${theme.primary(clean(worktreeName(input)))}`,
}
