## Local development

Everything runs via Nix, token-free:

Ports live in one place — the `ports` attrset in `flake.nix`; the runners
export them, so nothing here hardcodes a number.

| Command | What |
| --- | --- |
| `nix run .#dev` | full stack: shared postgres + backend + frontend |
| `nix run .#frontend` | Next.js site only |
| `nix run .#backend` | axum API only (ensures the shared postgres) |
| `nix run .#db` | ensure the shared ev_invest postgres is up (+ this repo's `landing` db) |
| `nix run .#gen-api` | regenerate `backend/openapi.json` + the TS client (run after any DTO/handler change; commit both) |
| `nix run .#test` | frontend typecheck + i18n + Tailwind conflict gates + Playwright visual regression (Linux; see `frontend/README.md`) |
| `nix run .#accept-test` | re-capture visual baselines (all, or `-- <names>`) |
| `nix develop -c cargo test --workspace` | backend and domain unit tests |
| `nix run .#pull-prod-db` | replace the local landing db with prod's (`PROD_DB=evinvest` before the move) |
| `nix run .#publish` | bump latest remote `vX.Y.Z` tag (`-- major\|minor\|patch`) + push |

Frontend runs pull docs from checkouts next to `landing/` — `_estate/whitepaper/`,
`blog/`, both optional. A missing checkout just warns: docs degrade to a PDF link.

## Microfrontends — no iframes

Other EV surfaces compose at runtime through `frontend/shared/mfe`, never via
`<iframe>`. Full reference: [`frontend/PATTERNS.md` §8](../../frontend/PATTERNS.md)
and [`frontend/README.md`](../../frontend/README.md). The home portfolio section
is the analytics overview tile and `/analytics` the analytics dashboard, both
loaded live from `/mfe/analytics/` on this host (in dev rewritten to
`ANALYTICS_DEV_URL`, from `ANALYTICS_PORT`: run `nix run .#dev` in an
`EV-Estate/analytics` checkout); `/publications/whitepaper` and
`/publications/[slug]` are static HTML from the sibling typst repos.
