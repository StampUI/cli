# stampui

The official CLI for [StampUI](https://stampui.com): stamp production-ready, dark-first React and Next.js UI blocks straight into your project. No runtime dependency, no wrapper components. The code lands in your repo and it is yours.

```bash
npx stampui add billing-page
```

## Install

Use it on demand with `npx`, or install globally:

```bash
npm i -g stampui
```

## Usage

```bash
# Add a block (free blocks install from the npm package)
stampui add billing-page

# Authenticate once to unlock pro blocks (license key from your StampUI account)
stampui login

# Add a pro block (fetched from the licensed registry after login)
stampui add trading-terminal

# Update a block you already stamped to the latest version
stampui update billing-page
```

Free blocks are installed from the public `@stampui/blocks` package. Pro blocks are fetched from the licensed registry after `stampui login` with your license key.

## How it works

StampUI follows a component to block to template pyramid. The CLI resolves a block's files and its component dependencies, writes them into your project, and prints the import paths. You own the source: tweak it, theme it, ship it.

## Links

- Website and full catalog: https://stampui.com
- Free showcase: https://github.com/StampUI/ui

## License

MIT (the CLI). The blocks it installs are covered by the [StampUI license](https://stampui.com/docs/license).
