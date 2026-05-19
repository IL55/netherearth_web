# netherearth_web

Browser-based 3D strategy game built with Vue 3, BabylonJS, and TypeScript.

- [Play](https://IL55.github.io/netherearth_web/game/)
- [Documentation](https://IL55.github.io/netherearth_web/)

## Development

```bash
cd netherearth_web-ui
npm install
npm run dev       # dev server at http://localhost:5173
npm test          # run unit tests (Vitest, no browser/GPU needed)
npm run type-check
```

## Deploy

The game and docs deploy automatically via GitHub Actions on every push to `main`:

- **Game** — changes to `netherearth_web-ui/**` trigger a Vite build and deploy to `gh-pages/game/`
- **Docs** — changes to `docs/**` or `zensical.toml` trigger a Zensical build and deploy to `gh-pages/`

To deploy manually, push to `main` with the relevant files changed.
