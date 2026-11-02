import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join as joinTempPath } from 'node:path'
import { rm } from 'node:fs/promises'
import { test } from 'node:test'
import { join } from 'node:path'
import { PROJECT_ROOT } from './shared/project.ts'
import { assert, assertEquals, assertThrows } from './shared/test-assert.ts'
import { assertManagedPackageName } from './shared/fs.ts'

test('assertManagedPackageName rejects path traversal', () => {
  assertEquals(
    assertManagedPackageName('git-credential-manager'),
    'git-credential-manager',
  )
  assertThrows(
    () => assertManagedPackageName('../../outside'),
    Error,
    'Invalid package name',
  )
  assertThrows(
    () => assertManagedPackageName('nested/path'),
    Error,
    'Invalid package name',
  )
})

test('pkg list finds known packages outside repo cwd', async () => {
  const tempDir = await mkdtemp(joinTempPath(tmpdir(), 'pkg-list-test-'))
  const cliPath = new URL('./cli.js', import.meta.url).pathname

  try {
    const output = await promisify(execFile)(
      process.execPath,
      [cliPath, 'list'],
      {
        cwd: tempDir,
        env: {
          ...process.env,
          PPKG_REPOS: join(PROJECT_ROOT, 'repo'),
          PPKG_NO_UPDATE_CHECK: '1',
        },
      },
    )

    const stdout = output.stdout
    const stderr = output.stderr

    assertEquals(stderr, '')
    assert(stdout.includes('Available packages:'), stdout)
    assert(stdout.includes('  caddy'), stdout)
    assert(!stdout.includes('  No packages available'), stdout)
  } finally {
    await rm(tempDir, { recursive: true })
  }
})

test('pkg help lists outdated and update', async () => {
  const cliPath = new URL('./cli.js', import.meta.url).pathname
  const output = await promisify(execFile)(process.execPath, [
    cliPath,
    '--help',
  ])

  const stdout = output.stdout
  const stderr = output.stderr

  assertEquals(stderr, '')
  assert(stdout.includes('outdated'), stdout)
  assert(stdout.includes('update [name...]'), stdout)
})
