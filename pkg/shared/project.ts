import { findPackageJSON } from 'node:module'
import { dirname } from 'node:path'
const manifest = findPackageJSON(import.meta.url)
if (!manifest) throw new Error('Cannot locate ppkg package.json')
export const PROJECT_ROOT = dirname(manifest)
