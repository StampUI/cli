# Contributing to the StampUI CLI

Thanks for your interest in contributing. This repository is the source of truth for the `stampui` npm package; changes merged here ship in the next npm release.

## How the repos relate

StampUI has a public MIT open-source core and a commercial catalog:

- [`StampUI/cli`](https://github.com/StampUI/cli) (this repo): the CLI, fully MIT, developed in the open.
- [`StampUI/ui`](https://github.com/StampUI/ui): the free MIT components and blocks.
- The commercial catalog (pro blocks and templates on [stampui.com](https://stampui.com)) lives outside the public repos and funds the maintenance of the free core.

Contributions here should only target the MIT open-source surface. Do not submit PRs that include pro block source code, private registry data, license keys, or commercial catalog content. PRs that add ways to bypass license checks will be closed.

## Development setup

```bash
git clone https://github.com/StampUI/cli
cd cli
npm install
npm run build      # tsc -> dist/
npm test           # vitest
npm run typecheck  # tsc --noEmit
```

Test against a real project:

```bash
mkdir /tmp/stampui-playground && cd /tmp/stampui-playground
npm init -y && npm i react tailwindcss
node /path/to/cli/dist/index.js doctor
node /path/to/cli/dist/index.js add button
```

Or `npm link` inside the repo, then use `stampui` directly.

## What a good PR looks like

- One focused change per PR.
- CI green: typecheck, build, and tests must pass.
- New logic in `src/lib.ts` (or a new module) should come with tests. Command wiring in `src/index.ts` is currently untested; keep it thin.
- Update the README if you change command behavior or flags.
- Add a line to `CHANGELOG.md` under "Unreleased".
- No new runtime dependencies without discussing in an issue first; CLI startup time matters.

## Code style

- TypeScript, `strict` mode, no `any` in exported signatures.
- Named exports only.
- Comments only for non-obvious constraints, not to narrate the code.

## Proposing features

Open an issue before building anything significant. Good feature proposals explain the workflow problem, not just the flag you want to add.

## Reporting bugs

Use the bug report template. Include your OS, Node version, `stampui --version` output, and the exact command and output.

## Code of conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

By contributing you agree that your contributions are licensed under the [MIT License](./LICENSE).
