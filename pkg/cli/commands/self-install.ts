import { spawn } from 'node:child_process'
export const SELF_INSTALL_ARGS = [
  'install',
  '--global',
  '@patdx/ppkg@latest',
] as const
export async function runSelfInstall(): Promise<void> {
  console.log(`Running: npm ${SELF_INSTALL_ARGS.join(' ')}`)
  const child = spawn('npm', [...SELF_INSTALL_ARGS], { stdio: 'inherit' })
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`npm install failed (${signal ?? code})`))
    })
  })
  console.log('Installed as: ppkg')
}
