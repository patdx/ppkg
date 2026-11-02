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
- Build environment: `NODE_VERSION=24`, `PNPM_VERSION=12.16.1`
- Watch paths: `repo/**`, `repo-tools/**`, `pkg/**`, `scripts/**`, `package.json`,
  `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `wrangler.json`

Cloudflare installs dependencies before the build using the pnpm lockfile.
Workers Builds is the catalog deployment owner; there is no separate GitHub
Actions deployment workflow or GitHub Cloudflare credential to maintain.
The npm Release workflow independently publishes new CLI versions.

The legacy deployment workflow in dotfiles-public has been removed. Its catalog
copy is historical; edit and deploy this repository's catalog instead.
