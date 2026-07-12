// The single fixed dummy session used by every preview — the `init` install preview
// and the config TUI's live preview. Never real repo/session info.
//
// One copy, deliberately: `init` used to carry a leaner duplicate, so with the
// detailed default it previewed a 4-segment line while the installed status line
// rendered 10. A preview that under-sells the real thing is a lie by omission.
//
// It carries a value for every field the segments read, so a preview shows what a
// segment *will* look like rather than hiding it (the renderer's hide-don't-fake
// rule means a missing field silently drops the segment). Mirrors test/fixtures
// (src/ must not import from test/, so the shape is duplicated intentionally).
export const PREVIEW_INPUT = {
  now: 0,
  workspace: { current_dir: '/home/dev/ccbrief', repo: { name: 'ccbrief' } },
  git: { branch: 'main', added: 3, removed: 1 },
  model: { display_name: 'Opus' },
  context_window: { used_percentage: 42, total_input_tokens: 116_000, total_output_tokens: 12_000, current_usage: { input_tokens: 128_000 } },
  cost: { total_cost_usd: 1.23, total_lines_added: 120, total_lines_removed: 34 },
  effort: { level: 'high' },
  // resets_at is Unix epoch SECONDS; PREVIEW_INPUT.now is 0, so these are the
  // seconds-until-reset directly. Present so the preview shows the rate-limit
  // windows (standard leads with fiveHour; detailed adds weekly).
  rate_limits: {
    five_hour: { used_percentage: 40, resets_at: 2 * 3600 },            // 2h out
    seven_day: { used_percentage: 62, resets_at: (3 * 24 + 4) * 3600 }, // ~3d 4h out
  },
  // The five segments no preset ships. They are off by default, but the picker now
  // lists them, so ticking one has to SHOW something — a segment whose source field
  // is missing from this fixture would tick to a blank preview and read as broken.
  // Shapes follow the documented statusLine payload exactly (docs.claude.com →
  // statusline): `pr.review_state`, `worktree.name`, `output_style.name`, …
  thinking: { enabled: true },
  output_style: { name: 'concise' },
  agent: { name: 'code-reviewer' },
  pr: { number: 42, url: 'https://github.com/shehab267/ccbrief/pull/42', review_state: 'approved' },
  worktree: { name: 'feature-xyz', path: '/home/dev/.claude/worktrees/feature-xyz' },
}
