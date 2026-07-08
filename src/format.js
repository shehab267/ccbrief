// Shared value formatters used by usage segments (kept out of segment files so
// duration/countdown/token rendering is defined and tested in one place).

export function formatDuration(ms) {
  const totalMin = Math.floor((Number(ms) || 0) / 60_000)
  if (totalMin < 1) return '<1m'
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// Countdown to a rate-limit reset. Once the timestamp has passed we show
// `reset due` rather than fabricating a 0% / negative time.
export function formatCountdown(ms) {
  if (ms <= 0) return 'reset due'
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatTokens(n) {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`
}

export function sumTokens(usage) {
  return Object.values(usage ?? {}).reduce((a, v) => a + (Number(v) || 0), 0)
}
