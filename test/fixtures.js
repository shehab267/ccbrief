// Canonical dummy inputs. Shared by render/segment tests AND the TUI preview,
// so preview-correctness and test-correctness are one guarantee. No real data.
const NOW = 1_760_000_000_000 // fixed epoch ms; keeps countdowns deterministic

export const standard = {
  now: NOW,
  session_id: 'sess-standard',
  workspace: { current_dir: '/home/dev/ccbrief', repo: { name: 'ccbrief' } },
  git: { branch: 'main', added: 3, removed: 1 },
  model: { display_name: 'Opus' },
  context_window: {
    used_percentage: 42,
    remaining_percentage: 58,
    current_usage: { input_tokens: 90_000, output_tokens: 12_000, cache_read_input_tokens: 26_000 },
  },
  cost: { total_duration_ms: 5_040_000, total_cost_usd: 1.23, total_lines_added: 120, total_lines_removed: 34 },
  effort: { level: 'high' },
  thinking: { enabled: true },
  output_style: { name: 'concise' },
}

export const postCompact = {
  now: NOW,
  session_id: 'sess-compact',
  workspace: { current_dir: '/home/dev/ccbrief', repo: { name: 'ccbrief' } },
  git: { branch: 'main', added: 0, removed: 0 },
  model: { display_name: 'Opus' },
  // Early-in-session / post-/compact: percentages and usage are null → segments hide.
  context_window: { used_percentage: null, remaining_percentage: null, current_usage: null },
  cost: { total_duration_ms: 60_000, total_cost_usd: 0 },
}

export const noGit = {
  now: NOW,
  session_id: 'sess-nogit',
  workspace: { current_dir: '/tmp/scratch' },
  git: null,
  model: { display_name: 'Sonnet' },
  context_window: { used_percentage: 10, remaining_percentage: 90, current_usage: { input_tokens: 5_000 } },
  cost: { total_duration_ms: 30_000, total_cost_usd: 0.02 },
}

export const noRateLimits = {
  now: NOW,
  session_id: 'sess-nolimits',
  workspace: { current_dir: '/home/dev/ccbrief', repo: { name: 'ccbrief' } },
  git: { branch: 'main', added: 0, removed: 0 },
  model: { display_name: 'Opus' },
  context_window: { used_percentage: 20, remaining_percentage: 80, current_usage: { input_tokens: 40_000 } },
  cost: { total_duration_ms: 120_000, total_cost_usd: 0.1 },
  rate_limits: null, // non Pro/Max → absent
}

export const proMax = {
  now: NOW,
  session_id: 'sess-promax',
  workspace: { current_dir: '/home/dev/ccbrief', repo: { name: 'ccbrief' } },
  git: { branch: 'feat/layout', added: 8, removed: 2 },
  model: { display_name: 'Opus' },
  context_window: { used_percentage: 73, remaining_percentage: 27, current_usage: { input_tokens: 150_000, output_tokens: 20_000 } },
  cost: { total_duration_ms: 9_000_000, total_cost_usd: 4.56 },
  rate_limits: {
    // resets_at is Unix epoch SECONDS per the official contract (not ms).
    five_hour: { used_percentage: 40, resets_at: NOW / 1000 + 2 * 3600 }, // 2h out
    seven_day: { used_percentage: 12, resets_at: NOW / 1000 - 60 },       // already passed → "reset due"
  },
  effort: { level: 'high' },
}

export const withPr = {
  now: NOW,
  session_id: 'sess-pr',
  workspace: { current_dir: '/home/dev/ccbrief', repo: { name: 'ccbrief' }, git_worktree: '/home/dev/wt/ccbrief-pr' },
  git: { branch: 'feat/pr', added: 5, removed: 0 },
  model: { display_name: 'Opus' },
  context_window: { used_percentage: 33, remaining_percentage: 67, current_usage: { input_tokens: 60_000 } },
  cost: { total_duration_ms: 300_000, total_cost_usd: 0.5 },
  pr: { number: 7, review_state: 'approved', url: 'https://github.com/shehab267/ccbrief/pull/7' },
  agent: { name: 'reviewer' },
}
