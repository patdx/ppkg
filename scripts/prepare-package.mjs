import { chmod, readdir, rm } from 'node:fs/promises'
await chmod('dist/pkg/cli.js', 0o755)
for (const file of await readdir('dist/pkg', { recursive: true })) {
  if (/\.test\.|test-assert\./.test(file)) await rm(`dist/pkg/${file}`)
}
await rm('dist/pkg/scripts', { recursive: true, force: true })
