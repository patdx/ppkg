#!/usr/bin/env node
import { PKG_CLI_VERSION } from './shared/version.ts'
import { parseArgs } from 'node:util'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { maybeNotifyPkgUpdate } from './shared/npm-update-check.ts'
import {
  handleAddCommand,
  handleListCommand,
  handleOutdatedCommand,
  handleRemoveCommand,
  handleRepoCommand,
  handleUpdateCommand,
  printHelp,
  runSelfInstall,
} from './cli/commands/mod.ts'

export async function main(inputArgs: string[]): Promise<void> {
  if (inputArgs.length === 1 && inputArgs[0] === '--version') {
    console.log(PKG_CLI_VERSION)
    return
  }
  await maybeNotifyPkgUpdate()

  const { values: args, positionals } = parseArgs({
    args: inputArgs,
    allowPositionals: true,
    options: {
      verbose: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      url: { type: 'string' },
      'url-provider': { type: 'string' },
      version: { type: 'string' },
      name: { type: 'string', short: 'n' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (args.verbose) process.env.PPKG_VERBOSE = '1'

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  const [command, subcommand, ...rest] = positionals

  if (command === 'self-install' || command === 'self-update') {
    await runSelfInstall()
    return
  }

  if (command === 'list') {
    await handleListCommand()
    return
  }

  if (command === 'repo') {
    await handleRepoCommand(
      typeof subcommand === 'string' ? subcommand : undefined,
      rest,
    )
    return
  }

  if (command === 'outdated' || command === 'check') {
    await handleOutdatedCommand(positionals.slice(1))
    return
  }

  if (command === 'update' || command === 'upgrade') {
    const names = [subcommand, ...rest].filter(
      (value): value is string => typeof value === 'string',
    )
    await handleUpdateCommand(names, { dryRun: args['dry-run'] })
    return
  }

  if (command === 'remove') {
    if (!subcommand || typeof subcommand !== 'string') {
      console.error('Error: Package name is required')
      printHelp()
      process.exit(1)
    }
    await handleRemoveCommand(subcommand)
    return
  }

  if (command === 'add') {
    await handleAddCommand(args.url || subcommand, args, printHelp)
    return
  }

  printHelp()
  process.exit(1)
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
