# Changelog

All notable changes to the `stampui` CLI. Dates follow the npm publish history. Entries before 1.2.1 predate this changelog and are summarized conservatively rather than reconstructed in detail.

## Unreleased

- CLI `--version` now reads from package.json instead of a hardcoded string (previously reported 1.2.0 on the 1.2.1 build)
- Pure helpers (config, lock file, license key validation) extracted to `src/lib.ts` with a vitest test suite
- CI (typecheck, build, test) on GitHub Actions

## 1.2.1 (2026-06-20)

- License key validation is now case-insensitive and accepts the uppercase `SU_LIVE_-...` format issued by the payment provider
- Login and license messages updated to show the real key format

## 1.2.0 (2026-06-14)

First version whose source was published in this repository. As of this release the CLI includes:

- Free block delivery from the public `@stampui/blocks` 2.x package (MIT); pro blocks fetched from the licensed registry per request
- `update` command: checks `stampui.lock.json` against the latest registry versions and re-stamps outdated blocks after confirmation

## 1.0.0 to 1.1.1 (2026-05-17)

- Initial public releases: `init`, `add`, `list`, `search`, `doctor`, `login`, and `license` commands, followed by same-day fixes
