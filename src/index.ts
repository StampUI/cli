#!/usr/bin/env node

import { cac } from "cac"
import chalk from "chalk"
import ora from "ora"
import prompts from "prompts"
import fs from "fs"
import path from "path"
import {
  ProjectConfig,
  readPackageJson,
  readLockFile,
  writeLockFile,
  readLicense,
  saveLicense,
  getLicenseTier,
  canUseFramer,
  isValidLicenseKey,
  LICENSE_FILE,
} from "./lib"
import { blockList, manifests } from "@stampui/blocks"

const cli = cac("stampui")

// ── Registry (pro block delivery) ─────────────────────────────────────────────
// Pro sources never ship in the npm package. They are fetched from the
// licensed registry API; the license key is validated server-side per request.

const REGISTRY_URL = process.env.STAMPUI_REGISTRY_URL || "https://stampui.com"

interface RegistryFile {
  path: string
  content: string
}

async function fetchProBlock(
  slug: string,
  license: string
): Promise<{ files: RegistryFile[] } | { error: string }> {
  let res: Response
  try {
    res = await fetch(`${REGISTRY_URL}/api/registry/${slug}`, {
      headers: { authorization: `Bearer ${license}` },
    })
  } catch {
    return { error: `Could not reach the StampUI registry (${REGISTRY_URL}). Check your connection and try again.` }
  }

  if (res.status === 401) {
    return { error: "Invalid or expired license key. Run stampui login with a valid key, or visit https://stampui.com/pricing" }
  }
  if (!res.ok) {
    let detail = ""
    try {
      detail = ((await res.json()) as { error?: string }).error ?? ""
    } catch {}
    return { error: detail || `Registry returned ${res.status}. Try again shortly.` }
  }

  const data = (await res.json()) as { files?: RegistryFile[] }
  if (!data.files || data.files.length === 0) {
    return { error: "Registry response was empty. Try updating the StampUI CLI." }
  }
  return { files: data.files }
}

// ── Commands ──────────────────────────────────────────────────────────────────

cli
  .command("init", "Initialize StampUI in your project")
  .action(async () => {
    console.log(chalk.bold("\nStampUI\n"))

    const pkgJson = readPackageJson()
    const deps: Record<string, string> = {
      ...((pkgJson.dependencies as Record<string, string>) || {}),
      ...((pkgJson.devDependencies as Record<string, string>) || {}),
    }

    let detectedFramework = "React"
    if (deps["next"]) detectedFramework = "Next.js"
    else if (deps["vite"]) detectedFramework = "Vite"
    else if (deps["remix"] || deps["@remix-run/react"]) detectedFramework = "Remix"

    const hasTypeScript =
      !!deps["typescript"] || fs.existsSync(path.join(process.cwd(), "tsconfig.json"))

    const hasTailwind =
      !!deps["tailwindcss"] ||
      fs.existsSync(path.join(process.cwd(), "tailwind.config.ts")) ||
      fs.existsSync(path.join(process.cwd(), "tailwind.config.js"))

    console.log(chalk.gray(`Detected: ${detectedFramework}`))
    if (hasTailwind) console.log(chalk.gray("Detected: Tailwind CSS"))
    console.log()

    const response = await prompts([
      {
        type: "confirm",
        name: "typescript",
        message: "Are you using TypeScript?",
        initial: hasTypeScript,
      },
      {
        type: "text",
        name: "componentsPath",
        message: "Where should blocks be installed?",
        initial: "components/blocks",
      },
      {
        type: "text",
        name: "utilsPath",
        message: "Where is your core utilities file?",
        initial: "lib/core",
      },
    ])

    if (!response.componentsPath) {
      console.log(chalk.yellow("Cancelled."))
      return
    }

    const config: ProjectConfig = {
      componentsPath: response.componentsPath,
      utilsPath: response.utilsPath,
      typescript: response.typescript,
    }

    fs.writeFileSync(
      path.join(process.cwd(), "stampui.config.json"),
      JSON.stringify(config, null, 2)
    )

    console.log()
    console.log(chalk.green("✓ stampui.config.json created"))
    console.log(chalk.gray(`  Blocks will install to: ${config.componentsPath}/`))
    console.log()
    console.log(`Next: stamp your first block`)
    console.log(chalk.cyan("  pnpm dlx stampui add token-stream"))
  })

cli
  .command("add <block>", "Stamp a block into your project")
  .action(async (block: string) => {
    console.log(chalk.bold("\nStampUI\n"))

    const blockData = manifests[block]
    if (!blockData) {
      console.log(chalk.red(`× Block '${block}' not found.`))
      console.log(`\nRun ${chalk.cyan("stampui list")} to see available blocks.`)
      console.log(`Or browse at ${chalk.cyan("https://stampui.com/blocks")}`)
      process.exit(1)
    }

    const isPro = blockData.status === "pro" || blockData.status === "locked"
    const license = readLicense()

    if (isPro && !license) {
      console.log(chalk.red(`× ${block} is a Pro block.`))
      console.log()
      console.log(chalk.yellow("A StampUI Pro license is required."))
      console.log(`\nActivate your license:`)
      console.log(chalk.cyan("  stampui login SU_LIVE_-XXXX"))
      console.log(`\nGet a license at:`)
      console.log(chalk.cyan("  https://stampui.com/pricing"))
      process.exit(1)
    }

    const spinner = ora(`Stamping ${block}...`).start()

    try {
      const installedFiles: string[] = []
      const missingFiles: string[] = []

      if (isPro) {
        const result = await fetchProBlock(block, license!)
        if ("error" in result) {
          spinner.fail(`Failed to stamp ${block}`)
          console.log(chalk.red(`\n× ${result.error}`))
          process.exit(1)
        }
        for (const file of result.files) {
          const targetPath = path.join(process.cwd(), file.path)
          fs.mkdirSync(path.dirname(targetPath), { recursive: true })
          fs.writeFileSync(targetPath, file.content)
          installedFiles.push(file.path)
        }
      } else {
        const packagePath = require.resolve("@stampui/blocks/package.json")
        const packageDir = path.dirname(packagePath)

        for (const file of blockData.files) {
          const sourcePath = path.join(packageDir, "src", file.path)
          const targetPath = path.join(process.cwd(), file.path)

          fs.mkdirSync(path.dirname(targetPath), { recursive: true })

          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath)
            installedFiles.push(file.path)
          } else {
            missingFiles.push(file.path)
          }
        }
      }

      if (missingFiles.length > 0 && installedFiles.length === 0) {
        spinner.fail(`Failed to stamp ${block}`)
        console.log(chalk.red(`\n× Source files not found. Try updating StampUI CLI.`))
        process.exit(1)
      }

      spinner.succeed(`Stamped ${chalk.bold(block)} into your project`)

      const lock = readLockFile()
      lock[block] = { version: blockData.version, installedAt: new Date().toISOString().split("T")[0] }
      writeLockFile(lock)

      console.log(`\nFiles added:`)
      for (const f of installedFiles) {
        console.log(chalk.gray(`  ✓ ${f}`))
      }
      if (missingFiles.length > 0) {
        for (const f of missingFiles) {
          console.log(chalk.yellow(`  ⚠ ${f} (source missing, add manually)`))
        }
      }

      if (blockData.dependencies && blockData.dependencies.length > 0) {
        console.log(`\nInstall dependencies:`)
        console.log(chalk.cyan(`  pnpm add ${blockData.dependencies.join(" ")}`))
      }

      const mainFile = blockData.files.find((f) => f.type === "block") || blockData.files[0]
      const importPath = mainFile.path.replace(/\.tsx?$/, "")
      const componentName = block
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("")

      console.log(`\nImport:`)
      console.log(chalk.cyan(`  import { ${componentName} } from "@/${importPath}"`))
    } catch (e) {
      spinner.fail(`Failed to stamp ${block}`)
      console.log(chalk.red(`\n× ${e}`))
      process.exit(1)
    }
  })

cli
  .command("list", "List all available blocks")
  .option("--free", "Show only free blocks")
  .option("--pro", "Show only pro blocks")
  .action((options: { free?: boolean; pro?: boolean }) => {
    console.log(chalk.bold("\nStampUI Blocks\n"))

    let filtered = blockList
    if (options.free) filtered = filtered.filter((b) => b.status === "free" || b.status === "new")
    if (options.pro) filtered = filtered.filter((b) => b.status === "pro" || b.status === "locked")

    const byCategory: Record<string, typeof blockList> = {}
    for (const b of filtered) {
      const cat = b.category || "Other"
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(b)
    }

    for (const [category, items] of Object.entries(byCategory)) {
      console.log(chalk.dim(category))
      for (const b of items) {
        const statusLabel =
          b.status === "pro" || b.status === "locked"
            ? chalk.yellow(" Pro")
            : b.status === "new"
            ? chalk.blue(" New")
            : chalk.green(" Free")
        console.log(`  ${b.slug}${statusLabel}`)
      }
      console.log()
    }

    console.log(chalk.dim(`${filtered.length} blocks total`))
    console.log(chalk.dim(`Stamp a block: pnpm dlx stampui add <block>`))
  })

cli
  .command("search <query>", "Search blocks by name or tag")
  .action((query: string) => {
    const q = query.toLowerCase()
    const results = blockList.filter(
      (b) =>
        b.slug.includes(q) ||
        b.title.toLowerCase().includes(q) ||
        b.tags.some((t) => t.includes(q)) ||
        b.category?.toLowerCase().includes(q)
    )

    if (results.length === 0) {
      console.log(chalk.yellow(`\nNo blocks found for "${query}".`))
      console.log(chalk.dim(`Run ${chalk.cyan("stampui list")} to see all blocks.`))
      return
    }

    console.log(chalk.bold(`\n${results.length} result${results.length > 1 ? "s" : ""} for "${query}"\n`))
    for (const b of results) {
      const statusLabel =
        b.status === "pro" || b.status === "locked"
          ? chalk.yellow("Pro")
          : b.status === "new"
          ? chalk.blue("New")
          : chalk.green("Free")
      console.log(`  ${chalk.bold(b.slug)} ${statusLabel}`)
      console.log(chalk.dim(`    ${b.description}`))
    }
  })

cli
  .command("doctor", "Check your project is ready for StampUI")
  .action(() => {
    console.log(chalk.bold("\nStampUI Doctor\n"))

    const pkgJson = readPackageJson()
    const deps: Record<string, string> = {
      ...((pkgJson.dependencies as Record<string, string>) || {}),
      ...((pkgJson.devDependencies as Record<string, string>) || {}),
    }

    const hasPkgJson = Object.keys(pkgJson).length > 0
    const hasReact = !!deps["react"]
    const hasNext = !!deps["next"]
    const hasVite = !!deps["vite"]
    const hasTailwind = !!deps["tailwindcss"]
    const hasTypeScript =
      !!deps["typescript"] || fs.existsSync(path.join(process.cwd(), "tsconfig.json"))
    const hasConfig = fs.existsSync(path.join(process.cwd(), "stampui.config.json"))
    const license = readLicense()

    const check = (label: string, ok: boolean, warn = false) => {
      if (ok) console.log(chalk.green(`✓ ${label}`))
      else if (warn) console.log(chalk.yellow(`⚠ ${label}`))
      else console.log(chalk.red(`× ${label}`))
    }

    check("package.json found", hasPkgJson)
    check("React installed", hasReact)
    check("Framework detected (Next.js or Vite)", hasNext || hasVite, true)
    check("Tailwind CSS installed", hasTailwind, true)
    check("TypeScript available", hasTypeScript, true)
    check("stampui.config.json present", hasConfig, true)
    check(
      license ? `License: Pro active (${license.slice(0, 12)}...)` : "License: Free tier",
      true
    )

    const allGood = hasPkgJson && hasReact && hasTailwind
    console.log()
    if (allGood) {
      console.log(chalk.green("Your project is ready. Stamp a block:"))
      console.log(chalk.cyan("  pnpm dlx stampui add token-stream"))
    } else {
      console.log(chalk.yellow("Fix the issues above, then run stampui init."))
    }
  })

cli
  .command("login [key]", "Activate your StampUI license")
  .action(async (key?: string) => {
    console.log(chalk.bold("\nStampUI Login\n"))

    let licenseKey = key
    if (!licenseKey) {
      const response = await prompts({
        type: "password",
        name: "key",
        message: "Paste your license key (SU_LIVE_-...)",
      })
      licenseKey = response.key
    }

    if (!licenseKey) {
      console.log(chalk.yellow("Cancelled."))
      return
    }

    if (!isValidLicenseKey(licenseKey)) {
      console.log(chalk.red("× Invalid license key format."))
      console.log(chalk.dim("  Expected: SU_LIVE_-XXXXXXXX-XXXX-..."))
      console.log(chalk.dim("  Get one:  https://stampui.com/pricing"))
      process.exit(1)
    }

    const spinner = ora("Activating license...").start()
    saveLicense(licenseKey)
    spinner.succeed("License saved. Pro blocks are now available.")
    console.log(chalk.dim(`\nStored at: ${LICENSE_FILE}`))
    console.log(chalk.dim("Your key is verified against the registry on every pro install."))
    console.log(chalk.cyan("\nTry a Pro block:"))
    console.log(chalk.cyan("  pnpm dlx stampui add ai-chat-shell"))
  })

cli
  .command("license <action> [key]", "Manage your StampUI license  (actions: set <key>, status)")
  .action((action: string, key?: string) => {
    if (action === "set") {
      if (!key) {
        console.log(chalk.red("× Usage: stampui license set <key>"))
        process.exit(1)
      }
      if (!isValidLicenseKey(key)) {
        console.log(chalk.red("× Invalid license key format."))
        console.log(chalk.dim("  Expected: SU_LIVE_-XXXXXXXX-XXXX-..."))
        console.log(chalk.dim("  Get one:  https://stampui.com/pricing"))
        process.exit(1)
      }
      const spinner = ora("Activating license...").start()
      saveLicense(key)
      spinner.succeed("License activated. Pro blocks are now available.")
      console.log(chalk.dim(`\nStored at: ${LICENSE_FILE}`))
      console.log(chalk.cyan("\nTry a Pro block:"))
      console.log(chalk.cyan("  pnpm dlx stampui add ai-chat-shell"))
    } else if (action === "status") {
      const license = readLicense()
      const tier = getLicenseTier()
      const framer = canUseFramer()

      if (license) {
        console.log(chalk.green(`✓ Pro license active`))
        console.log(chalk.dim(`  Key: ${license.slice(0, 16)}...`))
        console.log(chalk.dim(`  Tier: ${tier}`))
        console.log(chalk.dim(`  Framer: unlimited`))
      } else {
        console.log(chalk.yellow("Free tier: no Pro license found."))
        console.log(chalk.dim(`  Framer plugin: ${framer.used}/${framer.limit} components used`))
        console.log()
        console.log(chalk.dim("  Activate: stampui login SU_LIVE_-XXXX"))
        console.log(chalk.dim("  Get one:  https://stampui.com/pricing"))
      }
    } else {
      console.log(chalk.red(`× Unknown action '${action}'. Use 'set <key>' or 'status'.`))
      process.exit(1)
    }
  })

cli
  .command("update [block]", "Update installed blocks to the latest version")
  .action(async (block?: string) => {
    console.log(chalk.bold("\nStampUI Update\n"))

    const lock = readLockFile()

    if (Object.keys(lock).length === 0) {
      console.log(chalk.yellow("No blocks installed via StampUI found in this project."))
      console.log(chalk.dim("Run stampui add <block> to install your first block."))
      return
    }

    const toCheck = block ? [block] : Object.keys(lock)
    const outdated: { slug: string; installed: string; latest: string }[] = []

    for (const slug of toCheck) {
      if (!lock[slug]) {
        console.log(chalk.yellow(`× ${slug} is not in your stampui.lock.json; run stampui add ${slug} first.`))
        continue
      }
      const manifest = manifests[slug]
      if (!manifest) {
        console.log(chalk.dim(`  ${slug}: not found in registry, skipping`))
        continue
      }
      if (manifest.version !== lock[slug].version) {
        outdated.push({ slug, installed: lock[slug].version, latest: manifest.version })
      }
    }

    if (outdated.length === 0) {
      console.log(chalk.green("✓ All blocks are up to date."))
      return
    }

    console.log(`${outdated.length} block${outdated.length > 1 ? "s" : ""} with updates available:\n`)
    for (const b of outdated) {
      console.log(`  ${chalk.bold(b.slug)}  ${chalk.dim(b.installed)} → ${chalk.cyan(b.latest)}`)
    }
    console.log()

    const { confirm } = await prompts({
      type: "confirm",
      name: "confirm",
      message: `Update ${outdated.length === 1 ? outdated[0].slug : `${outdated.length} blocks`}?`,
      initial: true,
    })

    if (!confirm) {
      console.log(chalk.dim("Cancelled."))
      return
    }

    const packagePath = require.resolve("@stampui/blocks/package.json")
    const packageDir = path.dirname(packagePath)
    const updatedLock = readLockFile()
    const license = readLicense()

    for (const b of outdated) {
      const blockData = manifests[b.slug]
      const isPro = blockData.status === "pro" || blockData.status === "locked"
      const spinner = ora(`Updating ${b.slug}...`).start()
      const installed: string[] = []
      const missing: string[] = []

      if (isPro) {
        if (!license) {
          spinner.fail(`${b.slug} is a Pro block. Run ${chalk.cyan("stampui login")} first.`)
          continue
        }
        const result = await fetchProBlock(b.slug, license)
        if ("error" in result) {
          spinner.fail(`Failed to update ${b.slug}`)
          console.log(chalk.red(`  × ${result.error}`))
          continue
        }
        for (const file of result.files) {
          const targetPath = path.join(process.cwd(), file.path)
          fs.mkdirSync(path.dirname(targetPath), { recursive: true })
          fs.writeFileSync(targetPath, file.content)
          installed.push(file.path)
        }
      } else {
        for (const file of blockData.files) {
          const sourcePath = path.join(packageDir, "src", file.path)
          const targetPath = path.join(process.cwd(), file.path)
          fs.mkdirSync(path.dirname(targetPath), { recursive: true })
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath)
            installed.push(file.path)
          } else {
            missing.push(file.path)
          }
        }
      }

      if (installed.length > 0) {
        spinner.succeed(`Updated ${chalk.bold(b.slug)} ${chalk.dim(b.installed)} → ${chalk.cyan(b.latest)}`)
        updatedLock[b.slug] = { version: blockData.version, installedAt: new Date().toISOString().split("T")[0] }
      } else {
        spinner.fail(`Failed to update ${b.slug}`)
      }

      if (missing.length > 0) {
        for (const f of missing) {
          console.log(chalk.yellow(`  ⚠ ${f} (source missing)`))
        }
      }
    }

    writeLockFile(updatedLock)
    console.log()
    console.log(chalk.green("✓ stampui.lock.json updated."))
  })

cli.help()
// Single source of truth for the version: package.json (resolved from dist/ at runtime).
cli.version((require("../package.json") as { version: string }).version)
cli.parse()
