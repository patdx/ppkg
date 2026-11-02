import { mkdtempSync, rmSync, createWriteStream } from 'node:fs'
import { readdir, readlink, rename, rm, writeFile } from 'node:fs/promises'
import { copy, exists, move } from './fs-utils.ts'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { spawn } from 'node:child_process'
import { homedir as getHomeDir, tmpdir } from 'node:os'

export const PKG_HOME = resolve(getHomeDir(), '.ppkg')
export const LOCAL_BIN_DIR = join(getHomeDir() || '', '.local', 'bin')
export const DESKTOP_DIR = join(getHomeDir(), '.local', 'share', 'applications')

const MANAGED_PACKAGE_NAME = /^[A-Za-z0-9._-]+$/

export function assertManagedPackageName(name: string): string {
  if (!MANAGED_PACKAGE_NAME.test(name)) {
    throw new Error(
      `Invalid package name '${name}'. Use only letters, numbers, dots, underscores, and hyphens.`,
    )
  }

  return name
}

export async function ensureBinInPath() {
  const path = process.env['PATH'] || ''
  if (!path.includes(LOCAL_BIN_DIR)) {
    const shell = process.env['SHELL'] || ''
    const isZsh = shell.includes('zsh')
    const shellRcFile = isZsh
      ? join(getHomeDir() || '', '.zshrc')
      : join(getHomeDir() || '', '.bashrc')

    console.log(`Detected shell: ${isZsh ? 'zsh' : 'bash'}`)

    await writeFile(shellRcFile, `\nexport PATH="$PATH:${LOCAL_BIN_DIR}"\n`, {
      flag: 'a',
    })

    console.log(`Added ${LOCAL_BIN_DIR} to PATH in ${shellRcFile}`)
    console.log(
      `Please restart your terminal or run 'source ${shellRcFile}' to apply the changes.`,
    )
  }
}

export async function downloadToFile(url: string, filePath: string) {
  console.log(`Downloading file from ${url} to ${filePath}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Download failed with HTTP ${response.status} ${response.statusText}: ${url}`,
    )
  }
  if (!response.body) {
    throw new Error(`Download returned no response body: ${url}`)
  }

  const temporaryPath = join(
    dirname(filePath),
    `.ppkg-download-${randomUUID()}`,
  )
  try {
    await pipeline(
      Readable.fromWeb(response.body),
      createWriteStream(temporaryPath, { flags: 'wx', mode: 0o600 }),
    )
    await rename(temporaryPath, filePath)
  } catch (error) {
    await rm(temporaryPath).catch(() => {})
    throw error
  }

  console.log(`Downloaded file to ${filePath}`)
}

async function runArchiveCommand(tool: string, args: string[]): Promise<void> {
  const child = spawn(tool, args, { stdio: ['ignore', 'ignore', 'inherit'] })
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${tool} failed (${signal ?? code})`))
    })
  })
}

export async function extractZip(zipPath: string, dir: string): Promise<void> {
  await runArchiveCommand('unzip', ['-o', zipPath, '-d', dir])
}

export async function extractTarXz(
  tarPath: string,
  dir: string,
): Promise<void> {
  await runArchiveCommand('tar', ['-xJf', tarPath, '-C', dir])
}

export async function extractTarGz(
  tarPath: string,
  dir: string,
): Promise<void> {
  await runArchiveCommand('tar', ['-xzvf', tarPath, '-C', dir])
}
export async function getProcessingDir(extractedDir: string): Promise<string> {
  const entries = []
  for (const entry of await readdir(extractedDir, { withFileTypes: true })) {
    entries.push(entry)
  }

  // If there's only one directory, return its path
  if (entries.length === 1 && entries[0].isDirectory()) {
    return join(extractedDir, entries[0].name)
  }

  // Otherwise, return the original extracted directory
  return extractedDir
}

export class TempDir implements Disposable {
  path: string

  constructor() {
    this.path = mkdtempSync(join(tmpdir(), 'ppkg-'))
  }

  [Symbol.dispose]() {
    console.log(`Removing temporary path ${this.path}`)
    rmSync(this.path, { recursive: true })
  }
}

export async function tryMove(
  from: string,
  to: string,
  options?: {
    overwrite?: boolean
  },
): Promise<void> {
  console.log(`Moving ${from} to ${to}`)

  try {
    await move(from, to, { overwrite: options?.overwrite })
  } catch {
    await copyAndDelete(from, to, { overwrite: options?.overwrite })
  }
}

async function copyAndDelete(
  from: string,
  to: string,
  options?: {
    overwrite?: boolean
  },
) {
  await copy(from, to, {
    overwrite: options?.overwrite,
  })
  await rm(from, {
    recursive: true,
  })
}

export async function listInstalledPackages() {
  const packages: Array<{
    name: string
    version: string
    path: string
  }> = []

  try {
    for (const entry of await readdir(LOCAL_BIN_DIR, { withFileTypes: true })) {
      if (!entry.isSymbolicLink()) continue

      const linkPath = join(LOCAL_BIN_DIR, entry.name)
      const realPath = await readlink(linkPath)

      // Check if it points to our PKG_HOME
      if (!realPath.includes(PKG_HOME)) continue

      // Get version by reading the 'current' symlink
      const pkgPath = join(PKG_HOME, entry.name)
      const currentPath = join(pkgPath, 'current')
      let version = 'unknown'
      try {
        const versionPath = await readlink(currentPath)
        version = versionPath.split('/').pop() || 'unknown'
      } catch {
        // Ignore errors reading version
      }

      packages.push({
        name: entry.name,
        version,
        path: realPath,
      })
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    console.error('Error reading installed packages:', error)
    return []
  }

  return packages
}

export async function removePackage(
  name: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const packageName = assertManagedPackageName(name)
    const localBinPath = join(LOCAL_BIN_DIR, packageName)
    const pkgPath = join(PKG_HOME, packageName)

    // Check if package exists
    if (!(await exists(localBinPath)) && !(await exists(pkgPath))) {
      return {
        success: false,
        error: `Package '${packageName}' is not installed`,
      }
    }

    // Remove symlink from .local/bin if it exists
    if (await exists(localBinPath)) {
      await rm(localBinPath)
    }

    // Remove package directory from ~/.ppkg if it exists
    if (await exists(pkgPath)) {
      await rm(pkgPath, { recursive: true })
    }

    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: `Failed to remove package '${name}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  }
}
