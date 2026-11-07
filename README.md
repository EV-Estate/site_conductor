# site_conductor
![Minimum Supported Rust Version](https://img.shields.io/badge/nightly-1.92+-ab6000.svg)
![Build time](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/valeratrades/b48e6f02c61942200e7d1e3eeabf9bcb/raw/site_conductor-build.json)
![Test time](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/valeratrades/b48e6f02c61942200e7d1e3eeabf9bcb/raw/site_conductor-test.json)

`landing` is the public landing of the **EV Investment** fund at
`estate.evinvest.ltd` — a real-estate advisory and investment fund specializing
in premium coastal developments in Quy Nhon, Vietnam. A Next.js 16 (App Router)
front end in [`frontend/`](frontend) sits next to an axum + Postgres API in
[`backend/`](backend) (vacancies, applications, contact, newsletter) with its
pure model in [`domain/`](domain). `/analytics` mounts the analytics dashboard
microfrontend; the investor cabinet is a separate app on
`invest.evinvest.ltd/cabinet`. Moved from
`EV-Main/site_conductor` at `ac600eb`. The shared design system ships as the
published `@evinvest/uikit`.
<!-- markdownlint-disable -->
<details>
<summary>
<h2>Installation</h2>
</summary>

## Deployment

One host, three routes (Traefik, k3s): `estate.evinvest.ltd/` → `landing-frontend`
(:58845), `estate.evinvest.ltd/api/v1` → `landing-backend` (:58846),
`estate.evinvest.ltd/mfe/analytics` → analytics (:59079). The backend owns the
`landing` Postgres database and applies `backend/migrations` itself at boot, so
rolling out an image applies its schema.

### Deploy

```sh
nix run .#publish -- major|minor|patch
```

That bumps the latest remote `vX.Y.Z` tag and pushes it — a tag is a deploy. The
tag triggers the release workflow (`containerRelease` in `flake.nix`): CI builds
the `frontend` and `backend` OCI images — re-resolving the private inputs (blog,
whitepaper) to fresh `main` — pushes them to
`ghcr.io/ev-estate/landing-{frontend,backend}`, and Flux rolls them out (see the
`gitops` repo). Frontend and backend are separate images, so each rolls out
independently.


</details>
<!-- markdownlint-restore -->

## Usage
### Local development

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

### Microfrontends — no iframes

Other EV surfaces compose at runtime through `frontend/shared/mfe`, never via
`<iframe>`. Full reference: [`frontend/PATTERNS.md` §8](./frontend/PATTERNS.md)
and [`frontend/README.md`](./frontend/README.md). The home portfolio section
is the analytics overview tile and `/analytics` the analytics dashboard, both
loaded live from `/mfe/analytics/` on this host (in dev rewritten to
`ANALYTICS_DEV_URL`, from `ANALYTICS_PORT`: run `nix run .#dev` in an
`EV-Estate/analytics` checkout); `/publications/whitepaper` and
`/publications/[slug]` are static HTML from the sibling typst repos.



<br>

<sup>Links for devs:</sup>
- <sup><a href="./docs/ARCHITECTURE.md">architecture</a></sup>
- <sup><a href="https://github.com/EV-Main/.github/blob/main/code/STYLE.md">style</a></sup>
- <sup><a href="https://github.com/EV-Main/.github/tree/main/code/conventions">conventions</a></sup>
- <sup><a href="https://github.com/EV-Main/.github/blob/main/code/conventions/git">contributing</a></sup>

#### License

<sup>
	Licensed under <a href="LICENSE">Blue Oak 1.0.0</a>
</sup>

<br>

<sub>
	Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in this crate by you, as defined in the Apache-2.0 license, shall
be licensed as above, without any additional terms or conditions.
</sub>

