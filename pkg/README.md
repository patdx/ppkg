# ppkg CLI source

The published CLI is [@patdx/ppkg on npm](https://www.npmjs.com/package/@patdx/ppkg).
See the [project README](../README.md) for installation, commands, and migration
notes. This directory contains the TypeScript CLI, binary installer, providers,
catalog resolver, schemas, and Node test suite.

Build from the repository root with `pnpm run build`, then run
`node dist/ppkg.js --help`.

GitHub raw release assets can use `url_provider: "github"` with a
`github_asset` selector such as `apktool_*.jar`, `type: "raw"`, and an
explicit `filename`. The selector supports `*` and must match exactly one
asset in the latest stable release. Subsequent direct raw URLs can include
`{release_tag}` to download a companion file from that same release tag.
