// Types, timings and the chip's placement classes shared by the header's
// pieces. The types are used across header.tsx, the bar and the drawer; the two
// timings are the drawer's stagger and are read only by the drawer and the
// sign-out control it beats against. Nothing here may import beyond types:
// scripts/build-shell.mts reads it under plain node.
export interface HeaderNavItem {
  label: string;
  href: string;
}

/** Accessible names for the menu controls, translated by the caller. */
export interface HeaderMenuLabels {
  open: string;
  close: string;
  menu: string;
  /** The drawer's sign-out control — visible text, not just an accessible name. */
  signOut: string;
  /** Shown in the drawer when sign-out is refused; the session is still live. */
  signOutFailed: string;
}

export const DEFAULT_MENU_LABELS: HeaderMenuLabels = {
  open: "Open menu",
  close: "Close menu",
  menu: "Site menu",
  signOut: "Sign out",
  signOutFailed: "Couldn't sign you out. Please try again.",
};

/** One signed-out entry into the cabinet: a hard cross-zone href and its label. */
export interface HeaderAuthLink {
  href: string;
  label: string;
}

/**
 * The static signed-out pair (issue #197): the primary opens an account, the
 * secondary is the plain "Cabinet" entry. Built per locale by `authLinks` in
 * nav-items.ts; rendered by header-cta.tsx on both hosts.
 */
export interface HeaderAuthLinks {
  openAccount: HeaderAuthLink;
  cabinet: HeaderAuthLink;
}

/** Milliseconds before the first drawer row moves — the panel leads, rows follow. */
export const MENU_ENTER_DELAY = 90;
/** Milliseconds between drawer rows. */
export const MENU_STEP = 45;

// The account chip is for the signed-in state only: it stays hidden until
// `data-session="authenticated"` lands on the header root — replayed from the
// last load by scripts/session-stamp.ts before the first paint, then confirmed
// or corrected by scripts/header-behavior.ts from /api/auth/session — while
// the static pair (header-cta.tsx) carries the signed-out state from the
// server HTML. The chip's own signed-out CTA never shows by design — it would
// double the pair's "Cabinet" — so exactly one of the two is visible once the
// session is known, and the pair alone before that. Shared by the conductor's
// slots (account-chip-remote.tsx) and the zone fragment
// (scripts/build-shell.mts) so the two hosts cannot drift.
//
// Both slots hold the chip's box before it mounts, because the element arrives
// late (a module script, then its CSS) and grows 178 → ~228px once the name
// lands. The reserve sits beside `hidden` rather than behind the session
// variant: a `display: none` box takes no space, so signed-out readers get no
// empty gap either way, and one variant per class would only triple the string.
//
// Bar: `justify-end` so the chip grows leftwards, away from the burger, which
// stays put. Below `sm` the chip is avatar + chevron (72 × 42, banking's B2)
// and is shown here too: the signed-out pair leaves the bar on sign-in, and an
// empty bar with only a burger hides the one thing that changed. A fixed `w-18`
// rather than a minimum there: the element holds an invisible 178px reserve of
// its own until its CSS applies, which a minimum would let push the slot out.
// The drawer's chip sits under the drawer itself whenever both are on screen.
export const CHIP_BAR_CLASS =
  "hidden min-h-10.5 w-18 items-center justify-end group-data-[session=authenticated]/header:flex sm:w-auto sm:min-w-44.5";
// Drawer: full row width already; only the height is reserved. The row is
// vertically centred, so a slot growing 24 → 42px under a half-styled chip
// moved the whole identity block by 9px (measured on slow 4G).
export const CHIP_MENU_CLASS =
  "hidden min-h-10.5 w-full items-center group-data-[session=authenticated]/header:flex";

// What the host tells the chip (banking #392): its signed-out CTA is the
// secondary "Cabinet" affordance, so it opens the login page in its plain
// sign-in state, never the signup one the pair's primary uses. No
// `data-return-to` on the marketing site — there is no in-cabinet page the
// reader was headed to. Applies to both hosts and both placements.
export const CHIP_BAR_ATTRIBUTES = { "data-intent": "login" } as const;
// The drawer gives the chip a full-width row, so it keeps its name there below
// `sm` instead of folding to avatar + chevron (`data-layout="menu"`, part of
// the chip's frozen v2 attribute set; CSS only on the chip's side). The bar
// does not set it: there the 72px fold is what fits beside the burger.
export const CHIP_MENU_ATTRIBUTES = {
  ...CHIP_BAR_ATTRIBUTES,
  "data-layout": "menu",
} as const;
