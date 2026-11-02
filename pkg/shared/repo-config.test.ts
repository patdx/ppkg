import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { getRepoSources } from './repo-config.ts'
import { DEFAULT_REMOTE_REPO } from './schema.ts'

const originalRepos = process.env.PPKG_REPOS
afterEach(() => {
  if (originalRepos === undefined) delete process.env.PPKG_REPOS
  else process.env.PPKG_REPOS = originalRepos
})

test('the remote catalog is not shadowed by the checkout catalog', async () => {
  delete process.env.PPKG_REPOS
  assert.deepEqual(
    await getRepoSources({ repos: [{ url: DEFAULT_REMOTE_REPO }] }),
    [{ base: DEFAULT_REMOTE_REPO, label: DEFAULT_REMOTE_REPO }],
  )
  assert.deepEqual(await getRepoSources({ repos: [] }), [])
})

test('configured catalogs keep priority and normalized duplicates are skipped', async () => {
  assert.deepEqual(
    await getRepoSources({
      repos: [
        { url: 'https://custom.example/' },
        { url: 'https://custom.example' },
        { url: '/tmp/local-catalog' },
      ],
    }),
    [
      { base: 'https://custom.example', label: 'https://custom.example' },
      { base: '/tmp/local-catalog', label: '/tmp/local-catalog' },
    ],
  )
})

test('PPKG_REPOS overrides default sources without adding a checkout catalog', async () => {
  process.env.PPKG_REPOS = ' https://custom.example/ , /tmp/local-catalog '
  assert.deepEqual(await getRepoSources(), [
    { base: 'https://custom.example', label: 'https://custom.example' },
    { base: '/tmp/local-catalog', label: '/tmp/local-catalog' },
  ])
})
