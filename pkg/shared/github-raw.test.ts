import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkUrl } from './url-checker.ts'

test('GitHub raw selectors retain release tags and reject ambiguous assets', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () =>
    Response.json({
      tag_name: 'v3.0.3',
      assets: [
        {
          name: 'apktool_3.0.3.jar',
          browser_download_url: 'https://example.test/tool.jar',
        },
        {
          name: 'source.zip',
          browser_download_url: 'https://example.test/source.zip',
        },
      ],
    })
  try {
    const result = await checkUrl('https://github.com/example/tool', 'github', {
      github_asset: 'apktool_*.jar',
    })
    assert.equal(result.type, 'raw')
    assert.equal(result.version, '3.0.3')
    assert.equal(result.releaseTag, 'v3.0.3')
    await assert.rejects(
      checkUrl('https://github.com/example/tool', 'github', {
        github_asset: '*',
      }),
      /found 2/,
    )
    await assert.rejects(
      checkUrl('https://github.com/example/tool', 'github', {
        github_asset: '*.exe',
      }),
      /found 0/,
    )
  } finally {
    globalThis.fetch = original
  }
})
