// Types and timings shared by the header's pieces. The types are used across
// header.tsx, the bar and the drawer; the two timings are the drawer's stagger.
export interface HeaderNavItem {
  label: string;
  href: string;
}

/** Accessible names for the menu controls, translated by the caller. */
export interface HeaderMenuLabels {
  open: string;
  close: string;
  menu: string;
}

/** The header's one entry into the cabinet: a hard href and its label. */
export interface HeaderCabinetLink {
  href: string;
  label: string;
}

/** Milliseconds before the first drawer row moves — the panel leads, rows follow. */
export const MENU_ENTER_DELAY = 90;
/** Milliseconds between drawer rows. */
export const MENU_STEP = 45;
