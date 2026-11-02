import { readFile, stat, writeFile } from 'node:fs/promises'
/**
 * Catalog document fetching with caching for @patdx/pkg.
 */
import { ensureDir } from './fs-utils.ts'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { PKG_HOME } from './fs.ts'
import { normalizeRepoBase } from './repo-config.ts'
import { compareSemver } from './semver.ts'
import { PKG_CLI_VERSION } from './version.ts'
import {
  type PackageDocument,
  parsePackageDocument,
  parseRepoListing,
  type RepoListing,
} from './schema.ts'

const CACHE_DIR = join(PKG_HOME, 'cache', 'repos')

/** Default cache TTL: 1 hour */
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000

export function isHttpBase(base: string): boolean {
  return base.startsWith('http://') || base.startsWith('https://')
}

export function isLocalBase(base: string): boolean {
  return (
    base.startsWith('file:') ||
    base.startsWith('/') ||
    base.startsWith('./') ||
    base.startsWith('../') ||
    /^[A-Za-z]:[\\/]/.test(base)
  )
}

export function localBaseToPath(base: string): string {
  if (base.startsWith('file:')) {
    return new URL(base).pathname
  }
  return base
}

function cacheKeyForRepo(base: string): string {
  return createHash('sha256').update(base).digest('hex').slice(0, 16)
}

function cacheDirForRepo(base: string): string {
  return join(CACHE_DIR, cacheKeyForRepo(base))
}

interface CacheMeta {
  fetched_at: number
  base: string
}

async function writeCacheMeta(dir: string, meta: CacheMeta): Promise<void> {
  await ensureDir(dir)
  await writeFile(join(dir, 'meta.json'), `${JSON.stringify(meta)}\n`)
}

/** Catalog JSON lives at the repo base (static files, no `/api` prefix). */
function catalogPath(base: string, ...parts: string[]): string {
  if (isHttpBase(base)) {
    return [base, ...parts].join('/')
  }
  return join(localBaseToPath(base), ...parts)
}

async function fetchText(url: string): Promise<string> {
  if (isHttpBase(url) || url.startsWith('file:')) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }
    return await response.text()
  }
  return await readFile(url, 'utf8')
}

async function readCachedText(
  path: string,
  maxAgeMs: number,
): Promise<string | null> {
  try {
    const info = await stat(path)
    const age = Date.now() - (info.mtime?.getTime() ?? 0)
    if (age > maxAgeMs) return null
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

async function fetchCatalogDocument<T>(
  base: string,
  cacheRelativePath: string,
  url: string,
  parse: (data: unknown) => T,
  options: { force?: boolean; ttlMs?: number } = {},
): Promise<T> {
  const normalized = normalizeRepoBase(base)
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS
  const cacheDir = cacheDirForRepo(normalized)
  const cachePath = join(cacheDir, cacheRelativePath)

  if (!options.force && isHttpBase(normalized)) {
    const cached = await readCachedText(cachePath, ttlMs)
    if (cached) {
      return parse(JSON.parse(cached))
    }
  }

  const text = await fetchText(url)
  const doc = parse(JSON.parse(text))

  if (isHttpBase(normalized)) {
    await ensureDir(dirname(cachePath))
    await writeFile(cachePath, text)
    await writeCacheMeta(cacheDir, {
      fetched_at: Date.now(),
      base: normalized,
    })
  }

  return doc
}

function assertMinCliVersion(
  listing: RepoListing,
  cliVersion = PKG_CLI_VERSION,
): void {
  if (!listing.min_cli_version) return
  if (compareSemver(cliVersion, listing.min_cli_version) < 0) {
    throw new Error(
      `This catalog requires @patdx/pkg >= ${listing.min_cli_version} ` +
        `(current ${cliVersion}). Update the CLI and retry.`,
    )
  }
}

export async function fetchRepoListing(
  base: string,
  options: { force?: boolean; ttlMs?: number; cliVersion?: string } = {},
): Promise<RepoListing> {
  const listing = await fetchCatalogDocument(
    base,
    'repo.json',
    catalogPath(normalizeRepoBase(base), 'repo.json'),
    parseRepoListing,
    options,
  )
  assertMinCliVersion(listing, options.cliVersion)
  return listing
}

export async function fetchPackageDocument(
  base: string,
  name: string,
  options: { force?: boolean; ttlMs?: number } = {},
): Promise<PackageDocument> {
  return await fetchCatalogDocument(
    base,
    join('package', `${name}.json`),
    catalogPath(normalizeRepoBase(base), 'package', `${name}.json`),
    parsePackageDocument,
    options,
  )
}
