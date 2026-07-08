// Development segments: session line diff, PR status (clickable via OSC 8), and
// the active git worktree. Each hides when its source is absent.
const basename = (p) => String(p ?? '').split(/[\\/]/).filter(Boolean).pop() ?? ''
// OSC 8 hyperlink: the URL is invisible; only the link text takes columns.
const osc8 = (url, text) => `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`

export const lines = {
  id: 'lines', section: 'development',
  isAvailable: (input) => input?.cost?.total_lines_added != null || input?.cost?.total_lines_removed != null,
  format: (input, theme) => {
    const a = input.cost.total_lines_added ?? 0
    const d = input.cost.total_lines_removed ?? 0
    return `${theme.color('green', `+${a}`)}/${theme.color('red', `-${d}`)}`
  },
}

export const pr = {
  id: 'pr', section: 'development',
  isAvailable: (input) => input?.pr?.number != null,
  format: (input, theme) => {
    const text = `${theme.glyph('pr') ? theme.glyph('pr') + ' ' : ''}#${input.pr.number} ${input.pr.review_state ?? ''}`.trim()
    return input.pr.url ? osc8(input.pr.url, text) : text
  },
}

export const worktree = {
  id: 'worktree', section: 'development',
  isAvailable: (input) => Boolean(input?.workspace?.git_worktree || input?.worktree?.path),
  format: (input, theme) => {
    const p = input.workspace?.git_worktree || input.worktree?.path
    return `${theme.glyph('worktree') ? theme.glyph('worktree') + ' ' : ''}${basename(p)}`
  },
}
