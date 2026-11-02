import { ReadableStream } from 'node:stream/web'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join as joinTempPath } from 'node:path'
import { readdirSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { test } from 'node:test'
import { assertEquals, assertRejects } from './test-assert.ts'
import { downloadToFile } from './fs.ts'

async function withMockFetch(
  response: Response,
  test: (directory: string) => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch
  const directory = await mkdtemp(joinTempPath(tmpdir(), 'ppkg-download-test-'))
  globalThis.fetch = () => Promise.resolve(response)

  try {
    await test(directory)
  } finally {
    globalThis.fetch = originalFetch
    await rm(directory, { recursive: true })
  }
}

test('downloadToFile atomically replaces the destination on success', async () => {
  await withMockFetch(new Response('new contents'), async (directory) => {
    const destination = `${directory}/artifact`
    await writeFile(destination, 'old contents')

    await downloadToFile('https://example.test/artifact', destination)

    assertEquals(await readFile(destination, 'utf8'), 'new contents')
    assertEquals(
      [...readdirSync(directory, { withFileTypes: true })].map(
        (entry) => entry.name,
      ),
      ['artifact'],
    )
  })
})

test('downloadToFile rejects HTTP errors without changing the destination', async () => {
  await withMockFetch(
    new Response('not found', { status: 404, statusText: 'Not Found' }),
    async (directory) => {
      const destination = `${directory}/artifact`
      await writeFile(destination, 'keep me')

      await assertRejects(
        () => downloadToFile('https://example.test/missing', destination),
        Error,
        'HTTP 404 Not Found',
      )

      assertEquals(await readFile(destination, 'utf8'), 'keep me')
    },
  )
})

test('downloadToFile rejects an empty response body', async () => {
  await withMockFetch(new Response(null), async (directory) => {
    await assertRejects(
      () =>
        downloadToFile('https://example.test/empty', `${directory}/artifact`),
      Error,
      'no response body',
    )
  })
})

test('downloadToFile cleans up an interrupted stream and preserves the destination', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('partial'))
      controller.error(new Error('connection interrupted'))
    },
  })
  await withMockFetch(new Response(body), async (directory) => {
    const destination = `${directory}/artifact`
    await writeFile(destination, 'keep me')
    await assertRejects(
      () => downloadToFile('https://example.test/artifact', destination),
      Error,
      'connection interrupted',
    )
    assertEquals(await readFile(destination, 'utf8'), 'keep me')
    assertEquals(readdirSync(directory), ['artifact'])
  })
})
