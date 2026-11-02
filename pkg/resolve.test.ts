import { afterEach, beforeEach, test } from 'node:test'
import { join } from 'node:path'
import { PROJECT_ROOT } from './shared/project.ts'
import { assertEquals } from './shared/test-assert.ts'
import { resolvePackage } from './resolve.ts'
import { availableProviders } from './shared/url-checker.ts'

const originalRepos = process.env.PPKG_REPOS
const localRepo = join(PROJECT_ROOT, 'repo')
beforeEach(() => {
  process.env.PPKG_REPOS = localRepo
})
afterEach(() => {
  if (originalRepos === undefined) delete process.env.PPKG_REPOS
  else process.env.PPKG_REPOS = originalRepos
})

test('resolvePackage finds explicitly configured local catalog entries', async () => {
  const pkg = await resolvePackage('caddy')
  assertEquals(pkg.name, 'caddy')
  assertEquals(pkg.binary_name, 'caddy')
  assertEquals(pkg.files[0].url_provider, 'github')
  assertEquals(pkg.source, localRepo)
})

test('resolvePackage finds windsurf with named provider', async () => {
  const pkg = await resolvePackage('windsurf')
  assertEquals(pkg.files[0].url_provider, 'windsurf-stable')
  assertEquals(availableProviders.includes('windsurf-stable'), true)
})
