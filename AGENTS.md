# ppkg

Standalone TypeScript CLI for Linux/macOS, using Node.js >=22.18 and pnpm 12.16.1 for development.

- Source: `pkg/`; generated JavaScript: `dist/pkg/`.
- Catalog: `repo/`; generator: `repo-tools/`; Wrangler config: `wrangler.json`.
- Run `pnpm test` and `pnpm run check-schema` after code changes.
- Run `pnpm run gen-site` after catalog or installation-documentation changes.
- Preserve existing `~/.ppkg` configuration and installed-package layouts.
- Use single quotes, no semicolons, and two-space indentation.
- Do not edit generated HTML or JSON schemas directly; use their generators.
- Do not deploy or publish unless requested. Cloudflare Workers Builds owns
  catalog deployment from this repository; avoid adding a second deploy workflow.
