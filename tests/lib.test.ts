import { describe, it, expect, beforeEach, afterEach } from "vitest"
import fs from "fs"
import os from "os"
import path from "path"
import {
  DEFAULT_PROJECT_CONFIG,
  readProjectConfig,
  readPackageJson,
  readLockFile,
  writeLockFile,
  isValidLicenseKey,
} from "../src/lib"

let tmp: string

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stampui-test-"))
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe("isValidLicenseKey", () => {
  it("accepts lowercase keys", () => {
    expect(isValidLicenseKey("su_live_abcdef123456")).toBe(true)
  })

  it("accepts uppercase keys with a leading dash (Polar format)", () => {
    // Non-hex placeholder on purpose (see scripts/check-dist-secrets.mjs);
    // X still exercises the uppercase + leading-dash + UUID-shape path.
    expect(isValidLicenseKey("SU_LIVE_-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX")).toBe(true)
  })

  it("rejects keys with the wrong prefix", () => {
    expect(isValidLicenseKey("sk_live_abcdef123456")).toBe(false)
    expect(isValidLicenseKey("su_test_abcdef123456")).toBe(false)
  })

  it("rejects keys that are too short", () => {
    expect(isValidLicenseKey("su_live_abc")).toBe(false)
  })

  it("rejects keys with invalid characters", () => {
    expect(isValidLicenseKey("su_live_abc def12345")).toBe(false)
    expect(isValidLicenseKey("su_live_abc!def12345")).toBe(false)
  })
})

describe("readProjectConfig", () => {
  it("returns defaults when stampui.config.json is missing", () => {
    expect(readProjectConfig(tmp)).toEqual(DEFAULT_PROJECT_CONFIG)
  })

  it("returns defaults when the config file is malformed", () => {
    fs.writeFileSync(path.join(tmp, "stampui.config.json"), "{not json")
    expect(readProjectConfig(tmp)).toEqual(DEFAULT_PROJECT_CONFIG)
  })

  it("reads an existing config file", () => {
    const config = { componentsPath: "src/ui", utilsPath: "src/lib", typescript: false }
    fs.writeFileSync(path.join(tmp, "stampui.config.json"), JSON.stringify(config))
    expect(readProjectConfig(tmp)).toEqual(config)
  })
})

describe("readPackageJson", () => {
  it("returns an empty object when package.json is missing", () => {
    expect(readPackageJson(tmp)).toEqual({})
  })

  it("reads an existing package.json", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ name: "demo-app" }))
    expect(readPackageJson(tmp)).toEqual({ name: "demo-app" })
  })
})

describe("lock file", () => {
  it("returns an empty lock when stampui.lock.json is missing", () => {
    expect(readLockFile(tmp)).toEqual({})
  })

  it("round-trips lock entries", () => {
    const lock = {
      "hero-section": { version: "1.0.0", installedAt: "2026-06-01" },
      "faq-accordion": { version: "1.1.0", installedAt: "2026-06-02" },
    }
    writeLockFile(lock, tmp)
    expect(readLockFile(tmp)).toEqual(lock)
  })

  it("writes human-readable JSON", () => {
    writeLockFile({ button: { version: "1.0.0", installedAt: "2026-06-01" } }, tmp)
    const raw = fs.readFileSync(path.join(tmp, "stampui.lock.json"), "utf-8")
    expect(raw).toContain("\n")
  })
})
