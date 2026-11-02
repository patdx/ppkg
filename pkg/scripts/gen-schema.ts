import { writeFile } from 'node:fs/promises'
/**
 * Generate JSON Schema files under repo/ from Valibot schemas.
 */
import { join } from 'node:path'
import { generateCatalogJsonSchemas } from '../shared/schema.ts'
import { getRepoDir } from './_repo-dir.ts'

const repoDir = getRepoDir(import.meta.url)

const schemas = generateCatalogJsonSchemas()
const packagePath = join(repoDir, 'package.schema.json')
const repoPath = join(repoDir, 'repo.schema.json')

await writeFile(packagePath, `${JSON.stringify(schemas.package, null, 2)}\n`)
await writeFile(repoPath, `${JSON.stringify(schemas.repo, null, 2)}\n`)

console.log(`Wrote ${packagePath}`)
console.log(`Wrote ${repoPath}`)
