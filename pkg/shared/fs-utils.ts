import { access, mkdir, rename, cp, rm } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch (error) {
    if (
      ['ENOENT', 'ENOTDIR'].includes(
        (error as NodeJS.ErrnoException).code ?? '',
      )
    )
      return false
    throw error
  }
}
export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}
export async function copy(
  from: string,
  to: string,
  options?: { overwrite?: boolean },
): Promise<void> {
  await cp(from, to, {
    recursive: true,
    verbatimSymlinks: true,
    force: options?.overwrite ?? false,
    errorOnExist: !options?.overwrite,
  })
}
export async function move(
  from: string,
  to: string,
  options?: { overwrite?: boolean },
): Promise<void> {
  if (!options?.overwrite && (await exists(to)))
    throw new Error(`Destination exists: ${to}`)
  await ensureDir(dirname(to))
  if (options?.overwrite) await rm(to, { recursive: true, force: true })
  await rename(from, to)
}
