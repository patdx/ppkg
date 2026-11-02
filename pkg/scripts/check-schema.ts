import { readFile } from 'node:fs/promises'
/**
 * Fail if repo/*.schema.json is stale relative to Valibot schemas.
 */
import { join } from 'node:path'
import { generateCatalogJsonSchemas } from '../shared/schema.ts'
import { getRepoDir } from './_repo-dir.ts'

const repoDir = getRepoDir(import.meta.url)

function normalize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

const expected = generateCatalogJsonSchemas()
const actualPackage = await readFile(
  join(repoDir, 'package.schema.json'),
  'utf8',
)
const actualRepo = await readFile(join(repoDir, 'repo.schema.json'), 'utf8')

let stale = false
if (actualPackage !== normalize(expected.package)) {
  console.error('repo/package.schema.json is stale. Run: npm run gen-schema')
  stale = true
}
if (actualRepo !== normalize(expected.repo)) {
  console.error('repo/repo.schema.json is stale. Run: npm run gen-schema')
  stale = true
}

if (stale) {
  process.exit(1)
}

console.log('Catalog JSON Schema is up to date.')
