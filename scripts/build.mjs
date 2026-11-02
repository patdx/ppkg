import { rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
rmSync('dist', { recursive: true, force: true })
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc'], {
  stdio: 'inherit',
})
