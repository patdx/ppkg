import { test } from 'node:test'
import assert from 'node:assert/strict'
import { needsRelease } from './check-release.mjs'
const pkg = { name: '@patdx/ppkg', version: '0.10.0' }

test('skip an existing version', async () => {
  assert.equal(await needsRelease(pkg, async () => Response.json(pkg)), false)
})
test('publish a missing version', async () => {
  assert.equal(
    await needsRelease(pkg, async () => new Response(null, { status: 404 })),
    true,
  )
})
test('registry and authentication errors do not trigger publication', async () => {
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(
      needsRelease(pkg, async () => new Response(null, { status })),
      /Cannot check npm release/,
    )
  }
  await assert.rejects(
    needsRelease(pkg, async () => {
      throw new Error('offline')
    }),
    /offline/,
  )
})
test('reject unexpected registry metadata', async () => {
  await assert.rejects(
    needsRelease(pkg, async () => Response.json({ ...pkg, version: '0.9.0' })),
    /unexpected/,
  )
})
