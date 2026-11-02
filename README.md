# ppkg

[![npm version](https://img.shields.io/npm/v/%40patdx%2Fppkg)](https://www.npmjs.com/package/@patdx/ppkg)
[![CI](https://github.com/patdx/ppkg/actions/workflows/publish.yml/badge.svg?branch=main)](https://github.com/patdx/ppkg/actions/workflows/publish.yml)

Install and manage binary packages on Linux and macOS from a
[package catalog](https://repo.pmil.me) or a direct URL.

Published on npm as **[@patdx/ppkg](https://www.npmjs.com/package/@patdx/ppkg)**;
the command is `ppkg`. Zero npm runtime dependencies, with
[build provenance](https://www.npmjs.com/package/@patdx/ppkg) from GitHub Actions.

## Requirements and installation

Requires [Node.js 26 LTS](https://nodejs.org/en/download) (26.13.0 or newer within
the 26.x line) and npm. Only the latest Node LTS line is officially supported.
Archive extraction uses system `tar` (including xz support for `.tar.xz`) or
`unzip`. Windows is not supported.

Install [the npm package](https://www.npmjs.com/package/@patdx/ppkg):

```sh
npm install --global @patdx/ppkg
# Or run without a global installation:
npx @patdx/ppkg add caddy
```

### Migrating from Deno / JSR

Install the npm package above first. After it succeeds, remove the old Deno
launcher and refresh your shell's command cache:

```sh
deno uninstall -g ppkg
hash -r
command -v ppkg
```

If the Deno CLI still runs, use `type -a ppkg` to inspect your PATH. Your existing
`~/.ppkg` configuration, installed packages, and `~/.local/bin` links are preserved.
The final legacy JSR release is [@patdx/pkg@0.9.1](https://jsr.io/@patdx/pkg@0.9.1).

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

`ppkg self-update` installs the latest npm release. `self-install` is an alias.

Existing data stays in `~/.ppkg/`, executable symlinks in `~/.local/bin/`, and
shortcuts in `~/.local/share/applications/`. Configured repositories and cached
catalog documents keep their existing formats. `PPKG_REPOS` is a comma-separated
list of catalog URLs or paths that overrides all default sources.
Set `PPKG_NO_UPDATE_CHECK=1` to disable the optional npm update notice.

The CLI uses `https://repo.pmil.me` by default, or your configured repositories
in order. No catalog is bundled in the npm package, and a checkout's `repo/`
directory is only used when explicitly configured. Remote catalog documents are
cached for one hour; `ppkg repo update` refreshes them immediately. Catalog changes
therefore reach users without a CLI release. New provider code still requires a
CLI release.

To use the local catalog during development:

```sh
PPKG_REPOS=./repo node dist/ppkg.js list
```

`outdated` exits with status 1 when updates are available. `update` skips packages
installed directly from URLs and reports provider failures.

## Development

Use the Node version in `.node-version` and pnpm 12.16.1 (pinned in
`packageManager`) for development. GitHub Actions and Cloudflare Builds share
that Node version. Only the latest Node LTS line is officially supported and
tested; older LTS and non-LTS release lines are not supported.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run check-schema
pnpm run format:check
pnpm run gen-schema
pnpm run gen-site
node dist/ppkg.js --help
pnpm pack --pack-destination release
pnpm run check-package release/*.tgz
```

esbuild bundles the CLI and its runtime libraries into one `dist/ppkg.js` file.
The published package also includes TypeScript declarations and third-party
license notices. The `./install-binary` and `./resolve` library exports share that
bundle and support both ESM and CommonJS consumers. The schema generator
`@valibot/to-json-schema` is development-only and excluded from the bundle.

Tooling under `scripts/` runs directly as TypeScript on Node 26. The development
build also emits unbundled modules under `dist/pkg/` for source tests and catalog
tooling; only the single-file bundle, public declarations, README, and dependency
license notices are published. `pnpm run check-package <tarball>` installs a
packed release offline into a temporary directory and verifies its CLI and API
entry points without fetching dependencies.

Refresh the workflow actions with `pnpm run update:actions`. This uses pnpm’s
`--include-github-actions` mode and maintains commit SHA pins with version comments.

Edit catalog manifests under `repo/package/*.json`, then run `pnpm run gen-site`.
Valibot schemas in `pkg/shared/schema.ts` generate `repo/*.schema.json`.
`pnpm run bump-version patch` updates package.json, the CLI
version, and generated catalog pages. The catalog minimum CLI version is an
independent compatibility requirement; change it only when needed.

`pnpm run deploy:dry` validates the Cloudflare catalog deployment. `pnpm run deploy`
publishes to the existing Worker and domain. Cloudflare Workers Builds deploys
the catalog from this repository. See [repo-tools](repo-tools/README.md).

## Repository migration

This repository was extracted from `patdx/dotfiles-public` with `git filter-repo`,
retaining history for `pkg/`, `repo/`, `repo-tools/`, and catalog deployment CI.
The final Deno/JSR release, `@patdx/pkg@0.9.1`, directs users to npm. Historical
versions remain available on JSR; ongoing CLI releases and catalog deployment
are maintained here.

## CI and releases

Pull requests and branch pushes run tests on the Node version in `.node-version`
across Linux and macOS, check formatting and schemas, verify generated catalog pages, and build a
package. Pushes to `main` run those same checks through the Release workflow.
After both platform jobs pass, Release publishes the version in `package.json` if it
is not already on npm. Existing versions are skipped. Registry failures stop the
release rather than treating the version as missing.

To release:

```sh
pnpm run bump-version patch
git add .
git commit -m "Release next ppkg version"
git push origin main
```

The bump command synchronizes `package.json`, the CLI version, and catalog HTML.
No Git tag or manual workflow run is required. The Release workflow can also be
run manually on `main` to retry a failed publish.

Publishing uses npm trusted publishing (OIDC) and provenance: npm links each new
release to its GitHub source commit and build workflow. The trusted publisher for
`@patdx/ppkg` must authorize GitHub owner `patdx`, repository `ppkg`, and workflow
`publish.yml`, with direct publishing allowed and no environment restriction.
Builds and packaging use pnpm; npm's CLI uploads the completed tarball with
`--provenance`. No npm token is stored in GitHub.

Catalog deployment uses Cloudflare Workers Builds from `patdx/ppkg` on `main`.
It is independent of npm publication, so catalog updates need no CLI release.
The configuration is documented in [repo-tools](repo-tools/README.md).
