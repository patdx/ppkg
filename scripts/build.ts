import { rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { builtinModules } from 'node:module'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'

// Keep unbundled output for source tests, catalog tooling, and declarations.
rmSync('dist', { recursive: true, force: true })
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc'], {
  stdio: 'inherit',
})

const result = await build({
  entryPoints: ['pkg/bundle.ts'],
  outfile: 'dist/ppkg.js',
  bundle: true,
  platform: 'node',
  target: 'node26',
  format: 'esm',
  minify: true,
  legalComments: 'eof',
  metafile: true,
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
  },
})

// The only imports left in the single-file bundle must be Node builtins.
for (const output of Object.values(result.metafile.outputs)) {
  for (const imported of output.imports) {
    if (
      !imported.external ||
      !builtinModules.includes(imported.path.replace(/^node:/, ''))
    ) {
      throw new Error(`Unexpected external dependency: ${imported.path}`)
    }
  }
}

// Track code that survives tree-shaking, rather than every parsed import.
const bundledInputs = new Set(
  Object.values(result.metafile.outputs).flatMap((output) =>
    Object.entries(output.inputs)
      .filter(([, info]) => info.bytesInOutput > 0)
      .map(([input]) => input),
  ),
)
if (
  [...bundledInputs].some((input) =>
    input.includes('/@valibot/to-json-schema/'),
  )
) {
  throw new Error(
    'The development-only JSON Schema generator leaked into the runtime bundle',
  )
}

// Carry only the included dependencies' license notices into the npm tarball.
const licenses = new Map<string, string>()
for (const input of bundledInputs) {
  if (!input.startsWith('node_modules/')) continue
  let dir = dirname(resolve(input))
  while (!existsSync(join(dir, 'package.json')) && dirname(dir) !== dir)
    dir = dirname(dir)
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  if (licenses.has(manifest.name)) continue
  const license = [
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'license',
    'license.md',
  ].find((file) => existsSync(join(dir, file)))
  if (!license)
    throw new Error(
      `Missing license notice for bundled dependency ${manifest.name}`,
    )
  licenses.set(
    manifest.name,
    `${manifest.name}@${manifest.version}\n\n${readFileSync(join(dir, license), 'utf8')}`,
  )
}
writeFileSync(
  'dist/THIRD_PARTY_LICENSES.txt',
  [...licenses.values()].join('\n\n--------------------\n\n'),
)
console.log(
  `Built dist/ppkg.js with ${licenses.size} bundled dependencies and no external packages`,
)
