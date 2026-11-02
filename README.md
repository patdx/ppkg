# ppkg

Install and manage binary packages on Linux and macOS from URLs or a JSON catalog.
The default catalog is https://repo.pmil.me.

The npm package has zero runtime dependencies. esbuild bundles the CLI and its
libraries into `dist/ppkg.js`; TypeScript declarations and bundled dependency
license notices are included alongside it. Node.js and the system archive tools
below are still required. The `./install-binary` and `./resolve` library exports
continue to work, both backed by that same JavaScript file.

## Requirements and installation

Requires Node.js 26.13 or newer within the Node 26 LTS line, and npm. Archive extraction uses `tar` (with xz
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
The old repository and its JSR releases are unchanged. The new npm package name
is `@patdx/ppkg`; historical Deno releases remain `@patdx/pkg` on JSR.

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
