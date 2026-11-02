import { test } from 'node:test'
import { assertEquals } from './shared/test-assert.ts'
import { resolvePackage } from './resolve.ts'
import { availableProviders } from './shared/url-checker.ts'

test('resolvePackage finds builtin catalog entries', async () => {
  const pkg = await resolvePackage('caddy')
  assertEquals(pkg.name, 'caddy')
  assertEquals(pkg.binary_name, 'caddy')
  assertEquals(pkg.files[0].url_provider, 'github')
  assertEquals(pkg.source.startsWith('builtin:'), true)
})

test('resolvePackage finds windsurf with named provider', async () => {
  const pkg = await resolvePackage('windsurf')
  assertEquals(pkg.files[0].url_provider, 'windsurf-stable')
  assertEquals(availableProviders.includes('windsurf-stable'), true)
})
