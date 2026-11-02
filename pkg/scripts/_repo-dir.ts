import { join } from 'node:path'
import { PROJECT_ROOT } from '../shared/project.ts'
export function getRepoDir(_importMetaUrl?: string): string {
  return join(PROJECT_ROOT, 'repo')
}
