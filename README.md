# ppkg

Install and manage binary packages on Linux and macOS from URLs or a JSON catalog.
The default catalog is https://repo.pmil.me.

## Requirements and installation

Requires Node.js 22.18 or newer and npm. Archive extraction uses `tar` (with xz
support for `.tar.xz`) or `unzip` on your system. Windows is not supported.

Install from npm:

```sh
npm install --global @patdx/ppkg
# Or run without a global installation:
npx @patdx/ppkg add caddy
```

The executable remains `ppkg`. If an older Deno installation takes precedence,
check `command -v ppkg`, then remove that old launcher with `deno uninstall -g ppkg`
and install the Node version. This does not remove managed packages.

## Usage

```sh
ppkg add caddy
ppkg add https://github.com/duckdb/duckdb --name duckdb
ppkg list
ppkg outdated
ppkg update
ppkg update caddy
ppkg remove caddy
ppkg repo list
ppkg repo add https://example.com/catalog
ppkg repo update
ppkg self-update
```

`self-install` and `self-update` install the latest `@patdx/ppkg` from npm; they
use the npm release. They do not reinstall the old JSR package.

Existing data stays in `~/.ppkg/`, executable symlinks in `~/.local/bin/`, and
shortcuts in `~/.local/share/applications/`. Configured repositories and cached
catalog documents keep their existing formats. `PPKG_REPOS` is a comma-separated
list of catalog URLs or paths that overrides all default sources.
Set `PPKG_NO_UPDATE_CHECK=1` to disable the optional npm update notice.

The bundled catalog is checked first, followed by configured repositories.
`outdated` exits with status 1 when updates are available. `update` skips packages
installed directly from URLs and reports provider failures.

## Development

```sh
npm ci
npm test
npm run check-schema
npm run format:check
npm run gen-schema
npm run gen-site
node dist/pkg/cli.js --help
npm pack
```

Edit catalog manifests under `repo/package/*.json`, then run `npm run gen-site`.
Valibot schemas in `pkg/shared/schema.ts` generate `repo/*.schema.json`.
`npm run bump-version -- patch` updates package.json, package-lock.json, the CLI
version, and generated catalog pages. The catalog minimum CLI version is an
independent compatibility requirement; change it only when needed.

`npm run deploy:dry` validates the Cloudflare catalog deployment. `npm run deploy`
publishes to the existing Worker and domain; use only after moving deployment
ownership from dotfiles-public. See [repo-tools](repo-tools/README.md).

## Repository migration

This repository was extracted from `patdx/dotfiles-public` with `git filter-repo`,
retaining history for `pkg/`, `repo/`, `repo-tools/`, and catalog deployment CI.
The old repository and its JSR releases are unchanged. The new npm package name
is `@patdx/ppkg`; historical Deno releases remain `@patdx/pkg` on JSR.

The default CI validates changes and builds a package. Publishing and catalog
deployment are manual workflows. Configure npm trusted publishing before using
the publish workflow, and transfer catalog deployment secrets before deploying.
