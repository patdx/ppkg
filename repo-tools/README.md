# Catalog tooling

The static catalog and website live in `../repo/`. The site generator updates
`repo.json` and package HTML from `repo/package/*.json` and the root npm version.

Run commands from the repository root:

```sh
pnpm run gen-site
pnpm run check-schema
pnpm run deploy:dry
pnpm run deploy
```

Deployment uses Wrangler and the existing `patdx-pkg-repo` Worker at repo.pmil.me.
Configure `CLOUDFLARE_API_TOKEN` and, if needed, `CLOUDFLARE_ACCOUNT_ID` in the new
GitHub repository. Disable the old dotfiles-public deployment workflow when
transferring ownership so two repositories do not deploy competing catalogs.
Deployment is manual in this repository until that handoff is complete.
