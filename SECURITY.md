# Security Policy

## Reporting a vulnerability

Please report security issues **privately** via
[GitHub Private Vulnerability Reporting](https://github.com/shehab267/ccbrief/security/advisories/new).
Do not open a public issue for security reports.

We aim to acknowledge reports within 72 hours.

## Design & scope

CC Brief runs entirely locally:

- **No network calls, no telemetry.**
- The status-line renderer copied into `~/.claude` is a **self-contained bundled file**
  with no runtime dependencies (so it survives an `npx` cache eviction).
- **No `postinstall` or lifecycle scripts** — installation only happens when you
  explicitly run `npx ccbrief init`.
- The installer **backs up** your `settings.json` before making changes and only
  modifies the `statusLine` block.

## Supported versions

Pre-1.0: only the latest published version receives fixes.
