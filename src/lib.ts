import fs from "fs"
import path from "path"
import os from "os"

// ── Project config ────────────────────────────────────────────────────────────

export interface ProjectConfig {
  componentsPath: string
  utilsPath: string
  typescript: boolean
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  componentsPath: "components/blocks",
  utilsPath: "lib/core",
  typescript: true,
}

export function readProjectConfig(cwd: string = process.cwd()): ProjectConfig {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, "stampui.config.json"), "utf-8"))
  } catch {
    return { ...DEFAULT_PROJECT_CONFIG }
  }
}

export function readPackageJson(cwd: string = process.cwd()): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"))
  } catch {
    return {}
  }
}

// ── Lock file ─────────────────────────────────────────────────────────────────

export interface LockEntry {
  version: string
  installedAt: string
}

export function readLockFile(cwd: string = process.cwd()): Record<string, LockEntry> {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, "stampui.lock.json"), "utf-8"))
  } catch {
    return {}
  }
}

export function writeLockFile(lock: Record<string, LockEntry>, cwd: string = process.cwd()): void {
  fs.writeFileSync(path.join(cwd, "stampui.lock.json"), JSON.stringify(lock, null, 2))
}

// ── License ───────────────────────────────────────────────────────────────────
// The license key only gates access to the commercial registry. It is stored
// locally and validated server-side on every pro install; no pro source ships
// in this package.

export interface LicenseConfig {
  licenseKey?: string
  tier?: "free" | "pro" | "team"
  framerUsed?: number
  framerLimit?: number
}

export const LICENSE_DIR = path.join(os.homedir(), ".stampui")
export const LICENSE_FILE = path.join(LICENSE_DIR, "config.json")

export const FRAMER_FREE_LIMIT = 5

export function readLicenseConfig(): LicenseConfig {
  try {
    return JSON.parse(fs.readFileSync(LICENSE_FILE, "utf-8"))
  } catch {
    return {}
  }
}

export function readLicense(): string | null {
  return readLicenseConfig().licenseKey || null
}

export function saveLicense(key: string): void {
  fs.mkdirSync(LICENSE_DIR, { recursive: true })
  const existing = readLicenseConfig()
  fs.writeFileSync(LICENSE_FILE, JSON.stringify({
    ...existing,
    licenseKey: key,
    tier: "pro",
    framerLimit: -1,
  }, null, 2))
}

export function getLicenseTier(): "free" | "pro" | "team" {
  const config = readLicenseConfig()
  if (!config.licenseKey) return "free"
  return config.tier || "pro"
}

export function canUseFramer(): { allowed: boolean; used: number; limit: number } {
  const config = readLicenseConfig()
  const tier = getLicenseTier()
  if (tier === "pro" || tier === "team") {
    return { allowed: true, used: 0, limit: -1 }
  }
  const used = config.framerUsed ?? 0
  const limit = FRAMER_FREE_LIMIT
  return { allowed: used < limit, used, limit }
}

export function incrementFramerUsage(): void {
  fs.mkdirSync(LICENSE_DIR, { recursive: true })
  const config = readLicenseConfig()
  const used = (config.framerUsed ?? 0) + 1
  fs.writeFileSync(LICENSE_FILE, JSON.stringify({ ...config, framerUsed: used }, null, 2))
}

export function isValidLicenseKey(key: string): boolean {
  // Polar issues keys uppercase with a leading dash, e.g.
  // "SU_LIVE_-AAAAAAAA-1111-4222-8333-BBBBBBBBBBBB", so match case-insensitively.
  return /^su_live_[a-z0-9_-]{8,}$/i.test(key)
}
