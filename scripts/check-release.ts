import { appendFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export async function needsRelease(
  { name, version }: { name: string; version: string },
  fetchMetadata: typeof fetch = fetch,
): Promise<boolean> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
  const response = await fetchMetadata(url, {
    signal: AbortSignal.timeout(30_000),
  })
  if (response.status === 404) return true
  if (!response.ok)
    throw new Error(`Cannot check npm release: HTTP ${response.status}`)
  const published = (await response.json()) as {
    name?: string
    version?: string
  }
  if (published.name !== name || published.version !== version) {
    throw new Error('npm returned unexpected package metadata')
  }
  return false
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const pkg = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  )
  const publish = await needsRelease(pkg)
  console.log(
    `${pkg.name}@${pkg.version}: ${publish ? 'ready to publish' : 'already published; skipping'}`,
  )
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `publish=${publish}\n`)
}
