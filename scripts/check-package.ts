import { execFileSync } from 'node:child_process'
import {
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'

const tarball = process.argv[2]
if (!tarball) throw new Error('Usage: pnpm run check-package <tarball>')
const dir = await mkdtemp(join(tmpdir(), 'ppkg-package-'))
const isolated = await mkdtemp(join(tmpdir(), 'ppkg-standalone-'))
try {
  execFileSync(
    'npm',
    [
      'install',
      '--prefix',
      dir,
      '--omit=dev',
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
      resolve(tarball),
    ],
    { stdio: 'pipe' },
  )
  const root = join(dir, 'node_modules/@patdx/ppkg')
  const manifest = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'),
  )
  assert.deepEqual(manifest.dependencies ?? {}, {})
  assert.deepEqual(manifest.optionalDependencies ?? {}, {})
  const files = await readdir(root, { recursive: true })
  assert.deepEqual(
    files.filter((file) => file.endsWith('.js')),
    ['dist/ppkg.js'],
  )
  assert(!files.some((file) => file.startsWith('repo/')))
  assert.match(
    await readFile(join(root, 'dist/THIRD_PARTY_LICENSES.txt'), 'utf8'),
    /valibot/,
  )

  // It runs as a copied JS file, without a package.json or node_modules beside it.
  const standalone = join(isolated, 'ppkg.js')
  await copyFile(join(root, 'dist/ppkg.js'), standalone)
  const help = execFileSync(process.execPath, [standalone, '--help'], {
    encoding: 'utf8',
  })
  assert.match(help, /Usage: ppkg/)

  // Both existing subpath exports resolve through the one bundled JS file.
  const probe = join(dir, 'probe.cjs')
  await writeFile(
    probe,
    "const assert = require('node:assert/strict'); assert.equal(typeof require('@patdx/ppkg/resolve').resolvePackage, 'function'); assert.equal(typeof require('@patdx/ppkg/install-binary').downloadAndInstall, 'function')",
  )
  execFileSync(process.execPath, [probe], { stdio: 'pipe' })

  // TypeScript consumers need no third-party types to use the public APIs.
  const consumer = join(dir, 'consumer.mts')
  await writeFile(
    consumer,
    "import { resolvePackage } from '@patdx/ppkg/resolve'; import { downloadAndInstall } from '@patdx/ppkg/install-binary'; const pkg = await resolvePackage('caddy'); await downloadAndInstall(pkg)",
  )
  const config = join(dir, 'tsconfig.json')
  await writeFile(
    config,
    JSON.stringify({
      compilerOptions: {
        noEmit: true,
        strict: true,
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        types: [],
        lib: ['ES2023'],
      },
      files: [consumer],
    }),
  )
  execFileSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', '--project', config],
    { stdio: 'pipe' },
  )
  console.log(
    'Package verified: offline install, zero runtime dependencies, one JS file, working CLI and typed library exports',
  )
} finally {
  await rm(dir, { recursive: true, force: true })
  await rm(isolated, { recursive: true, force: true })
}
