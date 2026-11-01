# Deployment

One host, three routes (Traefik, k3s): `estate.evinvest.ltd/` → `landing-frontend`
(:58845), `estate.evinvest.ltd/api/v1` → `landing-backend` (:58846),
`estate.evinvest.ltd/mfe/analytics` → analytics (:59079). The backend owns the
`landing` Postgres database and applies `backend/migrations` itself at boot, so
rolling out an image applies its schema.

## Deploy

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
