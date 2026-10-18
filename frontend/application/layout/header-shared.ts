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
