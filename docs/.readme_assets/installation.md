# Deployment

Production runs on k3s, rolled out by Flux from the `gitops` repo; hosts,
failover and cluster setup live in
[EV-Main/devops](https://github.com/EV-Main/devops). On `estate.evinvest.ltd`
this app serves the coming-soon page, the REA dashboard at `/data` and 404s for
the retired landing pages; the landing itself is EV-Estate/landing.

## Deploy

```sh
nix run .#publish -- major|minor|patch
```

That bumps the latest remote `vX.Y.Z` tag and pushes it. The tag triggers the
release workflow (`containerRelease` in `flake.nix`): CI builds the `frontend`
and `backend` OCI images — re-resolving the private inputs (REA embeds, blog,
whitepaper) to fresh `main` — pushes them to `ghcr.io/ev-estate`, and Flux
rolls them out (see the `gitops` repo). Frontend and backend are separate
images, so each rolls out independently.
