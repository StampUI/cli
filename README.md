# stampui

[![npm](https://img.shields.io/npm/v/stampui?color=000)](https://www.npmjs.com/package/stampui)
[![downloads](https://img.shields.io/npm/dm/stampui?color=000)](https://www.npmjs.com/package/stampui)
[![CI](https://github.com/StampUI/cli/actions/workflows/ci.yml/badge.svg)](https://github.com/StampUI/cli/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/StampUI/cli?color=000)](./LICENSE)

The official CLI for [StampUI](https://stampui.com): stamp production-ready React and Next.js UI blocks straight into your project as real `.tsx` source files. No runtime dependency, no wrapper components. The code lands in your repo and it is yours.

```bash
npx stampui add hero-section
```

Because blocks install as plain source files, they work well with AI coding tools (Claude Code, Cursor, Copilot): the agent can read, refactor, and extend every installed component the same way it works with your own code.

## Install

Use it on demand with `npx` / `pnpm dlx`, or install globally:

```bash
npm i -g stampui
```

Requires Node 18 or newer.

## Commands

### `stampui init`

Detects your framework (Next.js, Vite, Remix), TypeScript, and Tailwind, then writes a `stampui.config.json`:

```bash
npx stampui init
```

### `stampui add <block>`

Stamps a block's source files into your project and records the installed version in `stampui.lock.json`:

```bash
npx stampui add faq-accordion
```

After installing it prints the files written, any npm dependencies the block needs, and the import path.

### `stampui list`

Lists every block in the registry, grouped by category. Filter by tier:

```bash
npx stampui list --free
npx stampui list --pro
```

### `stampui search <query>`

Free-text search across block slugs, titles, tags, and categories:

```bash
npx stampui search pricing
```

### `stampui update [block]`

Checks installed blocks (from `stampui.lock.json`) against the latest registry versions and re-stamps outdated ones after confirmation:

```bash
npx stampui update            # check everything
npx stampui update hero-section
```

Note: `update` overwrites the block's files with the latest upstream version. If you have local edits, review them with `git diff` before committing (a `stampui diff` command is on the roadmap, see issues).

### `stampui doctor`

Checks that your project is ready: package.json, React, a supported framework, Tailwind, TypeScript, and StampUI config:

```bash
npx stampui doctor
```

### `stampui login [key]` and `stampui license`

Activates a commercial license for pro blocks. Not needed for anything free:

```bash
npx stampui login             # prompts for the key
npx stampui license status    # show current tier
npx stampui license set <key>
```

The key is stored locally in `~/.stampui/config.json` and verified server-side on every pro install.

## Configuration

### `stampui.config.json`

Created by `stampui init` in your project root:

```json
{
  "componentsPath": "components/blocks",
  "utilsPath": "lib/core",
  "typescript": true
}
```

| Field | Meaning | Default |
|-------|---------|---------|
| `componentsPath` | Where block files are written | `components/blocks` |
| `utilsPath` | Where shared utilities live | `lib/core` |
| `typescript` | Whether the project uses TypeScript | `true` |

### `stampui.lock.json`

Written by `add` and `update`. Records which blocks are installed and at which version, so `stampui update` can tell you what is outdated:

```json
{
  "hero-section": { "version": "1.0.0", "installedAt": "2026-06-20" }
}
```

Commit this file: it is what makes installed blocks updatable instead of a one-way copy.

## Free vs pro: how delivery works

- **Free blocks** ship inside the public [`@stampui/blocks`](https://www.npmjs.com/package/@stampui/blocks) npm package (MIT). `stampui add` copies their source from that package. This works offline and requires no account.
- **Pro blocks** are part of the commercial StampUI catalog. Their source does not ship in this package or in any public repo; it is fetched from the licensed registry over HTTPS, authenticated with your license key per request.

This repository contains the full CLI source, including the license and registry client code. It never contains pro block source. See [stampui.com/pricing](https://stampui.com/pricing) for the commercial side; everything in this repo is MIT.

## Troubleshooting

**"Block 'x' not found"**: run `stampui list` to see valid slugs, or `stampui search <word>`. Your CLI may also be outdated: `npm i -g stampui@latest` refreshes the registry manifest.

**No package.json / wrong directory**: run the CLI from your project root. `stampui doctor` tells you exactly what is missing.

**Files written to unexpected paths**: blocks install relative to the current working directory using the paths in the block manifest (e.g. `components/core/button.tsx`). In monorepos, run the CLI from the app package (e.g. `apps/web`), not the workspace root. Better workspace detection is tracked in the issues.

**"Invalid or expired license key" (401)**: re-run `stampui login` with the key from your StampUI account. Keys look like `SU_LIVE_-XXXXXXXX-...` and are case-insensitive.

**"Could not reach the StampUI registry"**: only pro installs need network access. Check your connection or proxy; free blocks install offline.

**Update overwrote my local edits**: `update` asks for confirmation but then re-stamps the upstream source. Use `git diff` / `git checkout -p` to restore local changes selectively.

## Development

```bash
git clone https://github.com/StampUI/cli
cd cli
npm install
npm run build        # compile to dist/
npm test             # vitest
npm run typecheck
```

Run your local build against a test project:

```bash
node /path/to/cli/dist/index.js list
# or link it:
npm link             # then `stampui ...` uses your local build
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Links

- Website and full catalog: https://stampui.com
- Free component and block source: https://github.com/StampUI/ui
- Changelog: [CHANGELOG.md](./CHANGELOG.md)

## License

MIT for the CLI (this repository). Free blocks it installs are MIT via [`@stampui/blocks`](https://www.npmjs.com/package/@stampui/blocks). Pro blocks are covered by the [StampUI commercial license](https://stampui.com/docs/license).
