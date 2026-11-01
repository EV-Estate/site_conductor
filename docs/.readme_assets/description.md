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
