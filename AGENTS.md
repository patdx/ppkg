# ppkg

Standalone TypeScript CLI for Linux/macOS, using the latest Node.js LTS line and pnpm 12.16.1 for development.

- `.node-version` is the canonical Node version for development, CI, and Cloudflare.
- Support and test only the latest Node LTS line. Do not add older-Node compatibility jobs.
- Keep package engines and `@types/node` aligned when updating the Node LTS line.
- Source: `pkg/`; unbundled development output: `dist/pkg/`.
- Published runtime: esbuild bundle `dist/ppkg.js`; keep npm runtime dependencies empty.
- Keep dependencies as devDependencies, bundle them, and preserve their license notices.
- Run tooling scripts directly as `.ts` with Node 26; no `.mjs` wrappers are needed.
- Validate packed artifacts with `pnpm run check-package <tarball>`.
- Catalog: `repo/`; generator: `repo-tools/`; Wrangler config: `wrangler.json`.
- Refresh workflow action SHA pins with `pnpm run update:actions`.
- Run `pnpm test` and `pnpm run check-schema` after code changes.
- Run `pnpm run gen-site` after catalog or installation-documentation changes.
- Preserve existing `~/.ppkg` configuration and installed-package layouts.
- Use single quotes, no semicolons, and two-space indentation.
- Do not edit generated HTML or JSON schemas directly; use their generators.
- Do not deploy or publish unless requested. Cloudflare Workers Builds owns
  catalog deployment from this repository; avoid adding a second deploy workflow.
