import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtemp,
  writeFile,
  symlink,
  readlink,
  readFile,
  rm,
  stat,
} from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { copy, ensureDir, move } from './fs-utils.ts'

test('archive copy preserves relative symlinks and executable permissions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ppkg-copy-'))
  try {
    const source = join(dir, 'source')
    const target = join(dir, 'target')
    await ensureDir(source)
    await writeFile(join(source, 'binary'), 'binary', { mode: 0o755 })
    await symlink('binary', join(source, 'alias'))
    await copy(source, target, { overwrite: true })
    await rm(source, { recursive: true })
    assert.equal(await readlink(join(target, 'alias')), 'binary')
    assert.equal(await readFile(join(target, 'alias'), 'utf8'), 'binary')
    assert.equal((await stat(join(target, 'binary'))).mode & 0o777, 0o755)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('move replaces an existing version directory only when requested', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ppkg-move-'))
  try {
    const source = join(dir, 'source')
    const target = join(dir, 'target')
    await ensureDir(source)
    await ensureDir(target)
    await writeFile(join(source, 'new'), 'new')
    await writeFile(join(target, 'old'), 'old')
    await assert.rejects(() => move(source, target), /Destination exists/)
    assert.equal(await readFile(join(target, 'old'), 'utf8'), 'old')
    await move(source, target, { overwrite: true })
    assert.equal(await readFile(join(target, 'new'), 'utf8'), 'new')
    await assert.rejects(() => stat(join(target, 'old')), { code: 'ENOENT' })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
