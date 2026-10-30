`site_conductor` is the conductor shell of `estate.evinvest.ltd` for **EV Investment** — a
real-estate advisory and investment fund specializing in premium coastal
developments in Quy Nhon, Vietnam. The public landing moved to its own host
(repo EV-Estate/landing); this origin now serves a "coming soon" page at `/` and
answers 404 for every retired landing page — `/whitepaper`,
`/blogs/*`, `/publications/*`, `/team`, `/hiring`, … — with or
without a locale prefix, and never redirects to the new host. It mounts the
REA dashboard at `/data` (the `<mfe-real-estate-data>` page microfrontend). A Next.js 16 (App Router)
front end in [`frontend/`](frontend) lives alongside an axum API in
[`backend/`](backend). The shared design system ships as the published
`@evinvest/uikit`.
