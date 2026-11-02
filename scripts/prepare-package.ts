import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
await chmod('dist/ppkg.js', 0o755)
await mkdir('dist/types/shared', { recursive: true })
for (const file of [
  'install-binary.d.ts',
  'resolve.d.ts',
  'shared/schema.d.ts',
]) {
  const declaration = await readFile(`dist/pkg/${file}`, 'utf8')
  await writeFile(`dist/types/${file}`, declaration.replaceAll(".ts'", ".js'"))
}
