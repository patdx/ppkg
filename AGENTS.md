# ppkg

Standalone TypeScript CLI for Linux/macOS, using Node.js >=22.18 and npm.

- Source: `pkg/`; generated JavaScript: `dist/pkg/`.
- Catalog: `repo/`; generator and Wrangler configuration: `repo-tools/`.
- Run `npm test` and `npm run check-schema` after code changes.
- Run `npm run gen-site` after catalog or installation-documentation changes.
- Preserve existing `~/.ppkg` configuration and installed-package layouts.
- Use single quotes, no semicolons, and two-space indentation.
- Do not edit generated HTML or JSON schemas directly; use their generators.
- Do not deploy or publish unless requested. Catalog deployment ownership must
  first be transferred from dotfiles-public.
