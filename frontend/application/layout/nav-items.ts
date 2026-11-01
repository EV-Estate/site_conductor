import { localePath, type Locale } from "@evinvest/i18n";

import type { Translate } from "@evinvest/i18n";
import { CABINET_URL } from "@/shared/config/site";
import type { HeaderCabinetLink } from "./header-shared";

// One entry's label, deferred until a translator exists. A plain string would
// force the catalogue key back out of the call site, which is what the inline
// English exists to avoid; a `(t) => t(key, english)` thunk keeps both halves
// here beside the href they belong to.
export interface NavEntry {
  label: (t: Translate) => string;
  href: string;
  /**
   * A target owned by another app (the cabinet): rendered as a plain `<a>`,
   * never `next/link`, and never locale-prefixed, see CABINET_URL.
   */
  hard?: boolean;
}

/** A {@link NavEntry} resolved for one locale: translated label, prefixed href. */
export interface LocalizedNavEntry {
  label: string;
  href: string;
  hard?: boolean;
}

// Header navigation — single source for desktop + mobile menus. Portfolio /
// Research are root-relative anchors to the homepage sections (so they work
// from any route, then scroll); Publications / Team / Hiring / Contact are
// dedicated pages. The brand logo links home. The cabinet entry is rendered
// separately, from `cabinetLink` below (header-cta.tsx).
export const NAV_ITEMS: readonly NavEntry[] = [
  { label: t => t("nav.portfolio", "Portfolio"), href: "/#portfolio" },
  { label: t => t("nav.research", "Research"), href: "/#research" },
  { label: t => t("nav.publications", "Publications"), href: "/publications" },
  { label: t => t("nav.team", "Team"), href: "/team" },
  { label: t => t("nav.hiring", "Hiring"), href: "/hiring" },
  { label: t => t("nav.contact", "Contact"), href: "/contact" },
];

// Footer sitemap columns (EV-Main/site_conductor#34). Company = dedicated pages; Explore =
// homepage sections + research surfaces; Investors = the way into the cabinet
// plus the reports. Crawlable internal links from every page, so each
// destination is one hop from anywhere on the site.
export const FOOTER_NAV: readonly {
  heading: (t: Translate) => string;
  links: readonly NavEntry[];
}[] = [
  {
    heading: t => t("footer.company", "Company"),
    links: [
      { label: t => t("nav.home", "Home"), href: "/" },
      { label: t => t("nav.team", "Team"), href: "/team" },
      { label: t => t("nav.hiring", "Hiring"), href: "/hiring" },
      { label: t => t("nav.contact", "Contact"), href: "/contact" },
    ],
  },
  {
    heading: t => t("footer.explore", "Explore"),
    links: [
      { label: t => t("nav.portfolio", "Portfolio"), href: "/#portfolio" },
      {
        label: t => t("footer.calculator", "Investment Calculator"),
        href: "/#calculator",
      },
      {
        label: t => t("footer.fieldNotes", "Field Notes & Research"),
        href: "/publications",
      },
      {
        label: t => t("footer.whitepaper", "Whitepaper"),
        href: "/publications/whitepaper",
      },
    ],
  },
  {
    heading: t => t("footer.investors", "Investors"),
    links: [
      {
        label: t => t("footer.cabinet", "Cabinet"),
        href: CABINET_URL,
        hard: true,
      },
      { label: t => t("footer.reports", "Reports"), href: "/publications" },
    ],
  },
];

// The footer's legal row (EV-Main/site_conductor#204): the three documents the cabinet's
// documents config will also point at. Same NavEntry shape so the footer
// localises them with the sitemap columns and needs no second path builder.
export const LEGAL_NAV: readonly NavEntry[] = [
  { label: t => t("footer.legal.terms", "Terms"), href: "/terms" },
  { label: t => t("footer.legal.privacy", "Privacy"), href: "/privacy" },
  {
    label: t => t("footer.legal.risk", "Risk disclosure"),
    href: "/risk",
  },
];

// One place that turns the nav into what a given locale renders: translated
// label + locale-prefixed href. Without the href half, a reader on /ru/
// clicking "Команда" would land on the English /team.
export function localizeNav(
  items: readonly NavEntry[],
  locale: Locale,
  t: Translate
): LocalizedNavEntry[] {
  return items.map(item => ({
    label: item.label(t),
    href: item.hard ? item.href : localePath(locale, item.href),
    ...(item.hard && { hard: true }),
  }));
}

// The header's entry into the cabinet (header-cta.tsx). One link to the
// cabinet root: the cabinet decides itself whether a reader sees sign-in or
// their account. The label is kept within 20 characters in every locale — it shares
// the bar with the burger below `sm`, where a longer one overflows a 320px
// viewport.
export function cabinetLink(t: Translate): HeaderCabinetLink {
  return {
    href: CABINET_URL,
    label: t("header.openCabinet", "Open the cabinet"),
  };
}
