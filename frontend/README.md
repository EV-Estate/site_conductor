# landing — frontend

Public landing of the EV Investment fund, served at `estate.evinvest.ltd/` —
Next.js 16 (App Router) + React 19, laid out with Feature-Sliced Design, styled
with Tailwind v4. Moved from `site_conductor/frontend` (origin/main `ac600eb`)
without its zone machinery: the investor cabinet is a separate app on
`invest.evinvest.ltd/cabinet` (see [`PATTERNS.md` §9](./PATTERNS.md)).

## Layout

```
app/          routing + root layout (Server Components by default)
views/        page composition (HomeView), agnostic of A/B
features/     behaviour slices: analytics, ab-variant, error-monitoring, contact-message, job-application, publication-search
entities/     domain data (team, …)
shared/       app-agnostic ui/, lib/, config/, hooks/, mfe/ (microfrontend host)
application/  styles/globals.css → imports @evinvest/uikit/styles/tokens.css
public/       static assets (populated by the build; see below)
```

FSD import order `app → views → features → entities → shared`; import from a
slice's `index.ts`, never deep paths. Conventions live in [`PATTERNS.md`](./PATTERNS.md).

## Run

```sh
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL at least
npm ci && npm run dev
```

`public/` is filled by the build, not by hand: the whitepaper and publications
HTML/PDF, and a copy of `assets/`. Without them the dev server still boots.

Tailwind builds automatically inside Next via the `@tailwindcss/postcss` plugin —
no separate step. It imports the shared tokens from
`@evinvest/uikit/styles/tokens.css` through `application/styles/globals.css`;
tokens are owned by [`EV-Main/lib`](https://github.com/EV-Main/lib) and
reach this repo through a `@evinvest/uikit` bump, never a local edit.

## Checks

```sh
npm run check                # tsc --noEmit
npm run lint                 # eslint
npm run lint:css             # stylelint
npm run css:check            # Tailwind class conflicts in cn()
npm run i18n:check           # en generated from code + translation drift
npm run redirects:check      # /en/* collapse and the English rewrite
```

> The site calls only its own backend (vacancies / applications / contact / newsletter)
> through the generated client in `shared/api` — there is no hub API client here.

### Visual regression

`tests/sections.spec.ts` screenshots each home-page section (desktop and
mobile, plus the open mobile drawer), checks the first-viewport cabinet CTA and
the Russian portfolio. Baselines live in `tests/__screenshots__/`.

```sh
nix run .#test                      # check, i18n:check, css:check, then the suite against the baselines
nix run .#accept-test               # re-capture every baseline
nix run .#accept-test -- hero team  # re-capture only tests whose title matches a name
```

Linux only. The flake pins nixpkgs' Chromium, and a macOS render does not match
the committed Linux pixels, so baselines are never captured on a Mac. Known
limit: on darwin the dev shell's `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=nixos` makes
`tests/global-setup.ts` look for `chrome-linux64`; a local run needs
`unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE` first, and its diffs are not
meaningful.

CI: [`visual-baselines.yml`](../.github/workflows/visual-baselines.yml) runs on
PRs touching `frontend/`, `flake.*` or itself. The gate step runs
`nix run .#test` and keeps its expected/actual/diff images as the
`visual-diffs` artifact; the render step runs `nix run .#accept-test` and
uploads the fresh PNGs as `visual-snapshots`, even when the gate is red. To
refresh the baselines from a run, download them and look at every changed PNG
(and the run's `visual-diffs`) before committing — the artifact is what the
branch renders, not proof that the render is right:

```sh
gh run download <run-id> -R EV-Fund/landing -n visual-snapshots -D frontend/tests/__screenshots__
git add frontend/tests/__screenshots__
git commit -m 'test(visual): refresh baselines (run <run-id>)'
```

Status: the committed baselines are still the ones from `site_conductor@ac600eb`
and are stale — `header.png`, `mobile/header.png` and `mobile/header-drawer.png`
predate the header rewrite, and `cabinet-tour.png` / `mobile/cabinet-tour.png`
may too. Expect the gate to be red until they are refreshed from a CI run. The
job itself cannot pass until the repo has the `CACHIX_AUTH_TOKEN` secret.

## Environment

One typed reader, [`config.ts`](./config.ts); `process.env` anywhere else fails
lint. Annotated defaults: [`.env.example`](./.env.example). The prod values are
set in `flake.nix` (image build and container env).

| Variable | When | Prod value | If unset |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | build | `https://estate.evinvest.ltd` | placeholder origin at build; prod server refuses to boot |
| `NEXT_PUBLIC_API_URL` | build | `https://estate.evinvest.ltd` (`/api/v1` via Traefik) | throws on first use, dev and prod |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | build | literal in `flake.nix` | analytics no-op |
| `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_APP_ENV` | build | — | error monitoring no-op |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` / `_WEBSITE_ID` | build | — | Umami not loaded |
| `API_URL_INTERNAL` | runtime | `http://landing-backend:58846` | prod server throws on first server fetch; dev falls back to the public URL |
| `ANALYTICS_DEV_URL` | dev | — (the edge routes `/mfe/analytics`) | `/mfe/analytics/*` is not proxied |
| `SENTRY_DSN`, `APP_ENV`, `SENTRY_ORG` / `_PROJECT` / `_AUTH_TOKEN` | runtime / CI | — | no-op |

`NEXT_PUBLIC_*` is inlined at `next build`; changing it means a new image.
Dropped with the zone machinery: `CABINET_ZONE_URL`, `REA_ZONE_URL`,
`AUTH_WEB_URL`. The backend's contract (`CORS_ALLOWED_ORIGINS` and the rest) is
the `RawSettings` struct in `backend/src/config.rs`.

## Microfrontends

The landing composes other EV surfaces at runtime — **never via `<iframe>`** (see
[`PATTERNS.md` §8](./PATTERNS.md)). Two transports from `@/shared/mfe`:

| Remote ships… | Use | Mount |
| --- | --- | --- |
| a self-registering custom-element ESM bundle (React, Rust/WASM) | `RemoteElement` | light DOM; inline (`kind="component"`) or a whole page (`kind="page"`, `/analytics`) |
| a self-contained static HTML document (typst whitepaper/blog) | `RemoteDocument` | light DOM (`prose`) or, if self-styled, a shadow root |

### Element remotes — `RemoteElement`

Inline widgets or whole pages, JS bundles (React, …) or Rust/WASM (Dioxus, Leptos).

**Universal contract — a custom element.** Every microfrontend ships one
self-registering ESM bundle that calls `customElements.define("mfe-<service>-<name>", …)`.
The host mounts it with [`<RemoteElement>`](./shared/mfe/remote-element.tsx): load
the bundle by URL → `customElements.whenDefined(tag)` → render `<tag>`, mapping
props to attributes and CustomEvents to callbacks. The boundary is identical for
every framework. **Light DOM only** — Tailwind v4 `@property` tokens break inside
shadow roots, and the global uikit tokens must cascade in.

- **Inline widget or page** — render `<RemoteElement>` with the remote's `tag`,
  `scriptUrl` and `kind` as in-repo constants. A `component`'s stylesheet (its
  entry's stem, `overview.js` → `overview.css`) is demoted into the `reamfe`
  layer so host styles win; a `page`'s is not. `scriptUrl`s are operator-controlled and run
  third-party JS in this origin — **treat them as code**; gate them against an
  origin allowlist if they ever become user-/dynamically-sourced.

  ```tsx
  <RemoteElement tag="mfe-analytics-overview"
    scriptUrl="/mfe/analytics/overview.js" kind="component" />
  ```

**Producing a microfrontend** (other repos — this app ships no producer SDK). The
canonical, fuller recipe lives in the hub's
[`docs/ARCHITECTURE.md` § Microfrontends](https://github.com/EV-Main/banking/blob/main/docs/ARCHITECTURE.md#microfrontends); the
contract is shared with `cabinet`, so keep this in sync with it.

- **React** — wrap a component as a custom element with
  [`@r2wc/react-to-web-component`](https://github.com/bitovi/react-to-web-component);
  ship it as one ESM bundle that self-registers. _Optional_ for React-to-React
  widgets: Module Federation 2.0 **runtime** (`@module-federation/runtime` +
  `bridge-react`) to share one React instance — never `@module-federation/nextjs-mf`.
- **Rust/WASM** — Dioxus 0.7 mounts via `dioxus-web` `Config::rootelement(Element)`
  into the custom element; Leptos via `mount_to(HtmlElement, …)`. CSR-only, light
  DOM, `wasm-bindgen =0.2.125`. Don't use `dioxus-web-component` yet (it pins Dioxus
  0.6). _Open item:_ prove multiple independent Dioxus instances per page before
  relying on it.

### Document remotes — `RemoteDocument`

For remotes that are a self-contained **static HTML document** (the typst-built
[whitepaper](<./app/[locale]/publications/whitepaper>) and
[publications](<./app/[locale]/publications>)) rather than a custom-element
bundle. The document is addressed by URL (site-relative → read from `public/`;
absolute → fetched, so a doc service can move to its own origin) and composed into
the page natively, keeping the host chrome and scroll.

```tsx
// research article — no styles of its own: light DOM + host typography (prose),
// rendered server-side (SSR'd, indexable)
<RemoteDocument src={`/publications/${slug}.dark.html`} className="prose prose-invert …" />

// whitepaper — ships its own complete styles targeting bare tags: isolate it in a
// shadow root (a small client island; see PATTERNS.md for the React-19/DSD caveat)
<RemoteDocument src="/whitepaper.dark.html" isolate fallback={…PDF link…} />
```

`isolate={false}` (default) is a pure Server Component; `isolate` mounts a client
shadow island. A source that can't be loaded renders the `fallback`, so a missing
doc build degrades gracefully. The docs are produced by the sibling `whitepaper`/
`blog` repos and copied into `public/` by the build.

## Design system (Figma)

The visual language is mirrored in a Figma file
([`Main`](https://www.figma.com/design/e0V2P1cQpEFRuXTeNtEMh6/Main)), kept
**code-first**: [`application/styles/globals.css`](./application/styles/globals.css)
plus the shared `@evinvest/uikit/styles/tokens.css` (from
[`EV-Main/lib`](https://github.com/EV-Main/lib)) are the source of truth;
the Figma side is conformed to them, never the reverse.

- **Tokens → Figma Variables.** Three collections mirror the CSS tokens 1:1, each
  with `var(--token)` code syntax so Dev Mode round-trips cleanly: `ev/color`
  (the kit's roles and surfaces from `@evinvest/uikit/styles/tokens.css`:
  surfaces background / card / popover / muted, ink / ink-mid / ink-soft, lines
  border / input / ring, filled roles brand / primary + primary-ink / secondary /
  positive, and the accent ladder trace → debug → info → warn → error),
  `ev/semantic` (shadcn roles aliased onto `ev/color`), `ev/radius` (the
  `--radius` scale).
- **Components.** The shadcn `bricks` are rebuilt as Figma variant-sets bound to
  those Variables (Button, Badge, Input/Field, Checkbox, Switch, Card, Select,
  Tabs, Accordion, Tooltip), on a dark navy surface. Fonts: Inter (sans) +
  Playfair (display).

> Code Connect (the design↔code mapping) is intentionally **not** wired up: it
> requires a Figma Organization/Enterprise plan and the file is on Pro. Tokens and
> variant-sets work regardless.
