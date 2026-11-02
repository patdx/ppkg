# Catalog tooling

The static catalog and website live in `../repo/`. The site generator updates
`repo.json` and package HTML from `repo/package/*.json` and the root npm version.
The root `wrangler.json` serves `./repo` on the existing `patdx-pkg-repo` Worker
at https://repo.pmil.me.

Run commands from the repository root:

```sh
pnpm run gen-site
pnpm run check-schema
pnpm run deploy:dry
pnpm run deploy
```

## Cloudflare Workers Builds

Connect GitHub repository `patdx/ppkg`, production branch `main`, using:

- Root directory: `/`
- Build command: `pnpm run check-schema && pnpm run gen-site`
- Deploy command: `pnpm exec wrangler deploy`
- Node version: `.node-version` (shared with GitHub Actions)
- Build environment: `PNPM_VERSION=12.16.1`
- Watch paths: `repo/**`, `repo-tools/**`, `pkg/**`, `scripts/**`, `package.json`,
  `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `wrangler.json`,
  `.node-version`

Cloudflare installs dependencies before the build using the pnpm lockfile.
Workers Builds is the catalog deployment owner; there is no separate GitHub
Actions deployment workflow or GitHub Cloudflare credential to maintain.
The npm Release workflow independently publishes new CLI versions.

The legacy deployment workflow in dotfiles-public has been removed. Its catalog
copy is historical; edit and deploy this repository's catalog instead.

## Catalog compatibility and release timing

The catalog declares a repository-wide `min_cli_version` in `repo.json`.
Clients that implement this check reject the entire catalog when their version
is too old, with an instruction to upgrade. There is currently no per-package
minimum version check. Cached repository listings can also temporarily lag
behind newly deployed package documents; this guard is not an atomic snapshot
of the catalog.

The Apktool entry requires ppkg 0.12.0 for raw GitHub release asset selection
and companion URLs using `{release_tag}`, so the catalog minimum is 0.12.0.
Its JAR and launcher follow the latest stable GitHub release together.

Cloudflare catalog deployment and npm CLI publication run independently.
Pushing a commit that changes both does not guarantee the CLI is published
before the catalog is deployed. For now, this timing gap is accepted for this
single-user project: an older CLI may temporarily reject the catalog until
the required CLI version is available and installed.

For releases where uninterrupted compatibility matters, publish and verify the
compatible CLI first, then update the catalog in a later commit. Per-package
version requirements and coordinated deployment are future improvements, not
current guarantees.
