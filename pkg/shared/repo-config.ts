import { readFile, writeFile } from 'node:fs/promises'
import { PROJECT_ROOT } from './project.ts'
/**
 * Config loading and repo source resolution for @patdx/pkg.
 */
import { ensureDir, exists } from './fs-utils.ts'
import { join } from 'node:path'
import { PKG_HOME } from './fs.ts'
import { DEFAULT_REMOTE_REPO } from './schema.ts'

const CONFIG_PATH = join(PKG_HOME, 'config.json')

export interface RepoConfigEntry {
  url: string
}

export interface PkgConfig {
  repos: RepoConfigEntry[]
}

/** A catalog source after builtin discovery + config merge. */
export interface RepoSource {
  /** Normalized base URL or filesystem path. */
  base: string
  /** Display / ResolvedPackage.source label. */
  label: string
}

function getDefaultConfig(): PkgConfig {
  return {
    repos: [{ url: DEFAULT_REMOTE_REPO }],
  }
}

export async function loadConfig(): Promise<PkgConfig> {
  const fromEnv = process.env['PPKG_REPOS']
  if (fromEnv?.trim()) {
    return {
      repos: fromEnv
        .split(',')
        .map((url) => ({ url: url.trim() }))
        .filter((entry) => entry.url.length > 0),
    }
  }

  if (!(await exists(CONFIG_PATH))) {
    return getDefaultConfig()
  }

  try {
    const raw = JSON.parse(await readFile(CONFIG_PATH, 'utf8'))
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.repos)) {
      return getDefaultConfig()
    }
    const repos = raw.repos
      .filter(
        (entry: unknown): entry is RepoConfigEntry =>
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as RepoConfigEntry).url === 'string',
      )
      .map((entry: RepoConfigEntry) => ({ url: entry.url }))
    return repos.length > 0 ? { repos } : getDefaultConfig()
  } catch {
    return getDefaultConfig()
  }
}

export async function saveConfig(config: PkgConfig): Promise<void> {
  await ensureDir(PKG_HOME)
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`)
}

export function normalizeRepoBase(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Optional catalog bundled with the npm package or present in the checkout.
 */
async function discoverBuiltinRepoBase(): Promise<string | null> {
  const dir = join(PROJECT_ROOT, 'repo')
  if (!(await exists(join(dir, 'repo.json')))) return null
  return normalizeRepoBase(dir)
}

/**
 * Builtin (if present) first, then configured repos; duplicates skipped.
 * `PPKG_REPOS` is a full override — builtin is omitted so the env list
 * is the complete source of truth.
 */
export async function getRepoSources(
  config?: PkgConfig,
): Promise<RepoSource[]> {
  const fromEnv = Boolean(process.env['PPKG_REPOS']?.trim())
  const cfg = config ?? (await loadConfig())
  const sources: RepoSource[] = []
  const seen = new Set<string>()

  if (!fromEnv) {
    const builtin = await discoverBuiltinRepoBase()
    if (builtin) {
      seen.add(builtin)
      sources.push({ base: builtin, label: `builtin:${builtin}` })
    }
  }

  for (const entry of cfg.repos) {
    const base = normalizeRepoBase(entry.url)
    if (seen.has(base)) continue
    seen.add(base)
    sources.push({ base, label: base })
  }

  return sources
}
