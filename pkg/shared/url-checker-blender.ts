import type { UrlCheckResult, UrlProvider } from './url-checker.ts'

const DOWNLOAD_PAGE = 'https://www.blender.org/download/'
const RELEASE_INDEX = 'https://download.blender.org/release/'

interface BlenderReleaseDirectory {
  name: string
  major: number
  minor: number
}

function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (b[i] ?? 0) - (a[i] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

/**
 * Parse the Blender release index into version directories, newest first.
 * The download page itself is behind a Cloudflare challenge, so the plain
 * Apache index at download.blender.org is the stable source of truth.
 */
export function parseBlenderReleaseDirectories(
  html: string,
): BlenderReleaseDirectory[] {
  const directories: BlenderReleaseDirectory[] = []
  const pattern = /href="(Blender(\d+)\.(\d+))\/"/g
  for (const match of html.matchAll(pattern)) {
    directories.push({
      name: match[1],
      major: Number(match[2]),
      minor: Number(match[3]),
    })
  }
  return directories.sort((a, b) => b.major - a.major || b.minor - a.minor)
}

/**
 * Resolve the newest stable Linux archive in a Blender release directory.
 * Release candidates and beta builds are ignored because their file names
 * carry an extra suffix. Returns null when the directory has no matching
 * archive for the architecture.
 */
export function parseBlenderReleaseDirectory(
  html: string,
  directory: string,
  arch: string,
): UrlCheckResult | null {
  const platform =
    arch === 'x86_64' ? 'x64' : arch === 'aarch64' ? 'arm64' : null
  if (!platform) throw new Error(`Unsupported Blender architecture: ${arch}`)
  const pattern = new RegExp(
    `href="(blender-(\\d+)\\.(\\d+)\\.(\\d+)-linux-${platform}\\.tar\\.xz)"`,
    'g',
  )
  const archives: { filename: string; version: string; parts: number[] }[] = []
  for (const match of html.matchAll(pattern)) {
    archives.push({
      filename: match[1],
      version: `${match[2]}.${match[3]}.${match[4]}`,
      parts: [Number(match[2]), Number(match[3]), Number(match[4])],
    })
  }
  const latest = archives.sort((a, b) => compareVersions(a.parts, b.parts))[0]
  if (!latest) return null
  return {
    binaryUrl: `${RELEASE_INDEX}${directory}/${latest.filename}`,
    version: latest.version,
    type: 'tarxz',
    urlType: 'blender-stable',
  }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Blender release index: HTTP ${response.status} (${url})`)
  }
  return response.text()
}

export const blenderProvider: UrlProvider = {
  name: 'blender-stable',
  async check(url) {
    if (url !== DOWNLOAD_PAGE) return null
    if (process.platform !== 'linux') {
      throw new Error('Blender provider supports Linux only')
    }
    const arch =
      process.arch === 'x64'
        ? 'x86_64'
        : process.arch === 'arm64'
          ? 'aarch64'
          : process.arch
    const directories = parseBlenderReleaseDirectories(
      await fetchText(RELEASE_INDEX),
    )
    // A new branch can appear before its final builds are published, so fall
    // back through the most recent branches until a stable archive is found.
    for (const directory of directories.slice(0, 3)) {
      const result = parseBlenderReleaseDirectory(
        await fetchText(`${RELEASE_INDEX}${directory.name}/`),
        directory.name,
        arch,
      )
      if (result) return result
    }
    throw new Error(`No stable Blender Linux ${arch} download found`)
  },
}
