---
tags:
- adr
---
# ADR 9. Vite base URL set to `/netherearth_web/` for GitHub Pages

Date: 2026-05-20

## Status

Accepted

## Context

GitHub Pages hosts a repository's site at `https://<user>.github.io/<repo-name>/`, not at the root `/`. All asset URLs (models, sounds, maps, textures) must be prefixed with the repository name or they resolve to the wrong path on the live site and in local dev when using the same base.

## Decision

`vite.config.ts` sets `base: '/netherearth_web/'`. All asset paths in source code use `import.meta.env.BASE_URL` (which Vite resolves to the `base` value at build time) instead of hardcoded absolute paths starting with `/`.

```ts
// vite.config.ts
export default defineConfig({
  base: '/netherearth_web/',
  ...
})
```

Each file that constructs asset URLs defines a file-level constant:

```ts
const BASE_URL = import.meta.env.BASE_URL;
```

## Consequences

- Dev server (`npm run dev`) and production build use the same base, so asset paths are identical in both environments — no "works locally, breaks on deploy" class of bug.
- Adding a new asset path requires using `BASE_URL` as a prefix; a hardcoded `/` prefix will silently 404 on GitHub Pages.
- If the repository is ever renamed or moved to a custom domain at `/`, `base` must be updated in one place (`vite.config.ts`).
- `import.meta.env.BASE_URL` is inlined at build time by Vite — there is no runtime overhead.
