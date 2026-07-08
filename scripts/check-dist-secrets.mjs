#!/usr/bin/env node
/**
 * Fails if the built dist/ (what actually gets published to npm) contains a
 * real-looking secret. This is the last line of defense before an
 * irreversible `npm publish`: a secret that reaches the registry cannot be
 * removed from that version's tarball, only superseded.
 *
 * It exists because a real Polar license key once leaked into a source
 * comment, survived tsc into dist/index.js, and shipped in stampui@1.2.1.
 *
 * Patterns match the *real* shape only. Documentation placeholders in the
 * source are deliberately non-hex (e.g. SU_LIVE_-XXXX...), so they never
 * trip this; a real hex/UUID-shaped key does. Keep it that way.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist")

const PATTERNS = [
  // Polar license key, real shape: su_live_ + hex (with or without dashes).
  // Placeholders use X (not hex), so only genuine keys match.
  { name: "Polar license key (su_live_)", re: /su_live_-?[0-9a-f]{8,}/i },
  // Polar API / webhook / OAuth secrets.
  { name: "Polar token/secret (polar_*)", re: /polar_(oat|whs|at|pat)_[A-Za-z0-9._-]{10,}/ },
  // Generic bearer-ish long secrets assigned in code.
  { name: "hardcoded bearer/authorization secret", re: /authorization["'`]?\s*[:=]\s*["'`]bearer\s+[A-Za-z0-9._-]{16,}/i },
]

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : [p]
  })
}

const files = walk(distDir)
if (files.length === 0) {
  console.error(`check-dist-secrets: no dist/ found at ${distDir}. Run the build first.`)
  process.exit(1)
}

const findings = []
for (const file of files) {
  const text = fs.readFileSync(file, "utf-8")
  for (const { name, re } of PATTERNS) {
    const m = text.match(re)
    if (m) {
      const redacted = m[0].slice(0, 10) + "…(redacted)"
      findings.push(`  ${path.relative(process.cwd(), file)}: ${name} → ${redacted}`)
    }
  }
}

if (findings.length > 0) {
  console.error("check-dist-secrets: potential secret(s) in the publishable build:\n" + findings.join("\n"))
  console.error("\nRefusing to continue. Remove the secret from source, rebuild, and confirm this passes.")
  process.exit(1)
}

console.log(`check-dist-secrets: clean (${files.length} file(s) scanned)`)
