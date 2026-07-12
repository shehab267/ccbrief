// Shared value formatters used by usage segments (kept out of segment files so
// countdown/token rendering is defined and tested in one place).

// Strip terminal control characters (C0 + C1 — ESC, BEL, newlines, …) from
// session-derived values so a hostile directory/branch/PR field can't inject
// escape sequences or extra rows into the status line. Our own ANSI SGR and
// OSC 8 wrappers are added AFTER cleaning, so they're unaffected. A codepoint
// filter avoids embedding raw control chars in this source.
export function clean(str) {
  let out = ''
  for (const ch of String(str ?? '')) {
    const c = ch.codePointAt(0)
    if (c > 0x1f && c !== 0x7f && !(c >= 0x80 && c <= 0x9f)) out += ch
  }
  return out
}

// Countdown to a rate-limit reset. Once the timestamp has passed we show
// `reset due` rather than fabricating a 0% / negative time. The weekly window
// can be days out, so a day unit is required — otherwise `3d 4h` renders as a
// nonsensical `76h 0m`. Above a day we drop minutes (nobody needs `3d 4h 12m`).
export function formatCountdown(ms) {
  if (ms <= 0) return 'reset due'
  const totalMin = Math.floor(ms / 60_000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}d ${h}h`
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatTokens(n) {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`
}
