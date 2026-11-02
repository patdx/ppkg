import { readFile, writeFile } from 'node:fs/promises'
/**
 * Soft npm update check for the ppkg CLI.
 *
 * Non-blocking: prints a stderr notice when a newer @patdx/ppkg is published.
 * Skips when opted out, stderr is not a TTY, or the TTL cache is fresh.
 */
import { ensureDir, exists } from './fs-utils.ts'
import { dirname, join } from 'node:path'
import { PKG_HOME } from './fs.ts'
import { compareSemver } from './semver.ts'
import { PKG_CLI_VERSION } from './version.ts'

export const NPM_META_URL = 'https://registry.npmjs.org/@patdx%2fppkg'
export const UPDATE_CHECK_TTL_MS = 24 * 60 * 60 * 1000
export const PKG_UPDATE_CHECK_PATH = join(
  PKG_HOME,
  'cache',
  'pkg-update-check.json',
)

export interface NpmPackageMeta {
  'dist-tags'?: { latest?: string }
  versions?: Record<string, { deprecated?: string }>
}

interface UpdateCheckCache {
  checked_at: number
}

function isDeprecated(
  versions: Record<string, { deprecated?: string }> | undefined,
  version: string,
): boolean {
  return versions?.[version]?.deprecated !== undefined
}

/** Pick the newest non-deprecated version from npm package meta. */
export function pickLatestVersion(meta: NpmPackageMeta): string | null {
  const versions = meta.versions
  if (
    typeof meta['dist-tags']?.latest === 'string' &&
    meta['dist-tags']?.latest.length > 0 &&
    !isDeprecated(versions, meta['dist-tags']?.latest)
  ) {
    return meta['dist-tags']?.latest
  }

  if (!versions) return null

  let best: string | null = null
  for (const [version, info] of Object.entries(versions)) {
    if (info?.deprecated !== undefined) continue
    if (best === null || compareSemver(version, best) > 0) {
      best = version
    }
  }
  return best
}

export function shouldNotifyUpdate(
  currentVersion: string,
  latestVersion: string,
): boolean {
  return compareSemver(currentVersion, latestVersion) < 0
}

export function formatUpdateNotice(
  currentVersion: string,
  latestVersion: string,
): string {
  return [
    `Update available: @patdx/ppkg ${currentVersion} → ${latestVersion}`,
    '  Run: ppkg self-update',
    '  Or:  npm install -g @patdx/ppkg@latest',
  ].join('\n')
}

async function readCache(path: string): Promise<UpdateCheckCache | null> {
  try {
    if (!(await exists(path))) return null
    const raw = JSON.parse(await readFile(path, 'utf8'))
    if (!raw || typeof raw !== 'object' || typeof raw.checked_at !== 'number') {
      return null
    }
    return { checked_at: raw.checked_at }
  } catch {
    return null
  }
}

async function writeCache(
  path: string,
  cache: UpdateCheckCache,
): Promise<void> {
  await ensureDir(dirname(path))
  await writeFile(path, `${JSON.stringify(cache)}\n`)
}

export interface MaybeNotifyPkgUpdateOptions {
  currentVersion?: string
  ttlMs?: number
  cachePath?: string
  metaUrl?: string
  env?: { get(key: string): string | undefined }
  isTerminal?: () => boolean
  now?: () => number
  fetchMeta?: (url: string) => Promise<NpmPackageMeta>
  writeNotice?: (message: string) => void
}

/**
 * If due, fetch npm meta and print a non-blocking update notice to stderr.
 * Network / parse failures are silent.
 */
export async function maybeNotifyPkgUpdate(
  options: MaybeNotifyPkgUpdateOptions = {},
): Promise<void> {
  const env = options.env ?? { get: (key: string) => process.env[key] }
  if (env.get('PPKG_NO_UPDATE_CHECK') === '1') return

  const isTerminal = options.isTerminal ?? (() => Boolean(process.stderr.isTTY))
  if (!isTerminal()) return

  const now = options.now ?? Date.now
  const ttlMs = options.ttlMs ?? UPDATE_CHECK_TTL_MS
  const cachePath = options.cachePath ?? PKG_UPDATE_CHECK_PATH
  const currentVersion = options.currentVersion ?? PKG_CLI_VERSION

  const cached = await readCache(cachePath)
  if (cached && now() - cached.checked_at < ttlMs) return

  try {
    const fetchMeta = options.fetchMeta ?? defaultFetchMeta
    const meta = await fetchMeta(options.metaUrl ?? NPM_META_URL)
    const latest = pickLatestVersion(meta)
    await writeCache(cachePath, { checked_at: now() })

    if (!latest || !shouldNotifyUpdate(currentVersion, latest)) return

    const notice = formatUpdateNotice(currentVersion, latest)
    if (options.writeNotice) {
      options.writeNotice(notice)
    } else {
      console.error(notice)
    }
  } catch {
    // Keep startup quiet on network / parse failures.
  }
}

async function defaultFetchMeta(url: string): Promise<NpmPackageMeta> {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return (await response.json()) as NpmPackageMeta
}
