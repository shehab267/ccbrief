# Security Policy

## Reporting a vulnerability

Please report security issues privately through
[GitHub Private Vulnerability Reporting](https://github.com/shehab267/ccbrief/security/advisories/new).
Do not open a public issue for security reports.

We aim to acknowledge reports within 72 hours.

## Design and scope

ccbrief runs entirely on your machine:

- It makes no network calls and sends no telemetry.
- The renderer copied into `~/.claude` is a single bundled file with no runtime
  dependencies, so it keeps working after the `npx` cache is cleared.
- There is no `postinstall` or other lifecycle script. Nothing is installed until you
  run `npx ccbrief init`.
- The installer backs up your `settings.json` before changing it, and it only edits
  the `statusLine` block.

## Supported versions

Before 1.0, only the latest published version gets fixes.
