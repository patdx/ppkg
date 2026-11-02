import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { PROJECT_ROOT } from '../shared/project.ts'
const target = process.argv[2]
if (!target || !/^(major|minor|patch|[0-9]+\.[0-9]+\.[0-9]+)$/.test(target)) {
  throw new Error('Usage: pnpm run bump-version <major|minor|patch|x.y.z>')
}
execFileSync('pnpm', ['version', target, '--no-git-tag-version'], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
})
const { version } = JSON.parse(
  await readFile(join(PROJECT_ROOT, 'package.json'), 'utf8'),
)
await writeFile(
  join(PROJECT_ROOT, 'pkg/shared/version.ts'),
  `export const PKG_CLI_VERSION = '${version}'\n`,
)
execFileSync('pnpm', ['run', 'gen-site'], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
})
