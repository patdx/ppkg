import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  readlink,
  readdir,
  rm,
  stat,
} from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import { syncBuiltinESMExports } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const exec = promisify(execFile)

async function standalone() {
  const dir = await mkdtemp(join(os.tmpdir(), 'ppkg-bundle-'))
  const cli = join(dir, 'ppkg.js')
  await copyFile(join(root, 'dist/ppkg.js'), cli)
  return { dir, cli }
}

test('the single JS file runs help and a local catalog outside the checkout', async () => {
  const { dir, cli } = await standalone()
  try {
    const help = await exec(process.execPath, [cli, '--help'], { cwd: dir })
    assert.match(help.stdout, /Usage: ppkg/)
    const required = await exec(
      process.execPath,
      [
        '--input-type=commonjs',
        '-e',
        `const api = require(${JSON.stringify(cli)}); if (typeof api.resolvePackage !== 'function' || typeof api.downloadAndInstall !== 'function') throw new Error('Missing public APIs')`,
      ],
      { cwd: dir },
    )
    assert.equal(required.stdout, '')
    const list = await exec(process.execPath, [cli, 'list'], {
      cwd: dir,
      env: {
        ...process.env,
        PPKG_REPOS: join(root, 'repo'),
        PPKG_NO_UPDATE_CHECK: '1',
      },
    })
    assert.match(list.stdout, /  blender/)
    assert.match(list.stdout, /  caddy/)
    assert.deepEqual(await readdir(dir), ['ppkg.js'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('bundled library APIs resolve catalogs, install executables, and create Linux shortcuts', async () => {
  const { dir, cli } = await standalone()
  const originalHomedir = os.homedir
  const originalRepos = process.env.PPKG_REPOS
  const originalPath = process.env.PATH
  try {
    // Isolate installation paths without altering the user's home directory.
    os.homedir = () => dir
    syncBuiltinESMExports()
    const bin = join(dir, '.local/bin')
    const desktop = join(dir, '.local/share/applications')
    await mkdir(desktop, { recursive: true })
    process.env.PATH = `${bin}:${originalPath ?? ''}`
    process.env.PPKG_REPOS = join(root, 'repo')
    const { resolvePackage, downloadAndInstall } = await import(
      pathToFileURL(cli).href
    )
    assert.equal((await resolvePackage('caddy')).name, 'caddy')
    await downloadAndInstall({
      binary_name: 'bundle-test',
      version: '1.0.0',
      files: [
        {
          url: 'data:text/plain,%23!%2Fbin%2Fsh%0Aexit%200%0A',
          filename: 'bundle-test',
          type: 'raw',
          executable: true,
          url_provider: 'direct',
        },
      ],
      shortcut:
        process.platform === 'linux' ? { name: 'Bundle Test' } : undefined,
    })
    const installed = join(dir, '.ppkg/bundle-test/1.0.0/bundle-test')
    assert.match(await readFile(installed, 'utf8'), /exit 0/)
    assert.equal((await stat(installed)).mode & 0o111, 0o111)
    assert.match(await readlink(join(bin, 'bundle-test')), /bundle-test/)
    if (process.platform === 'linux') {
      const shortcuts = await readdir(desktop)
      assert.equal(shortcuts.length, 1)
      assert.match(
        await readFile(join(desktop, shortcuts[0]), 'utf8'),
        /Name=Bundle Test/,
      )
    }
  } finally {
    os.homedir = originalHomedir
    syncBuiltinESMExports()
    if (originalRepos === undefined) delete process.env.PPKG_REPOS
    else process.env.PPKG_REPOS = originalRepos
    if (originalPath === undefined) delete process.env.PATH
    else process.env.PATH = originalPath
    await rm(dir, { recursive: true, force: true })
  }
})
