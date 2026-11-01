// THE header, SSR'd on every page. Behavior lives in one client leaf
// (header-behavior.tsx), which toggles `data-scrolled` / `data-menu-open` on
// the root; the markup styles off them with `group-data-[...]/header:`
// variants, so the bar and drawer themselves carry no React state.
//   - The mobile drawer + scrim render inline, gated by `data-menu-open`.
//     `backdrop-blur` lives on the inner bar div, not the root: a
//     backdrop-filtered root would become the containing block for their
//     `fixed` boxes and clamp them to the bar.
//   - Header motion is CSS transitions off those data attributes, never
//     `motion` (PATTERNS §10, "The second engine: the header").
//   - The bar is `fixed` and takes no layout space.
import type { ReactNode } from "react";
import Link from "next/link";
import { HeaderActions } from "@/shared/ui/header-actions";
import { localePath, type Locale } from "@evinvest/i18n";
import { translate } from "@/shared/config/i18n";
import { CabinetEntryTracker } from "./cabinet-entry-tracker";
import { HeaderBar } from "./header-bar";
import { HeaderBehavior } from "./header-behavior";
import { HeaderBarCta, HeaderMenuCta } from "./header-cta";
import { HeaderMobileMenu } from "./header-mobile-menu";
import type { HeaderMenuLabels, HeaderNavItem } from "./header-shared";
import { NAV_ITEMS, cabinetLink, localizeNav } from "./nav-items";

export type { HeaderNavItem, HeaderMenuLabels };

interface BrandHeaderProps {
  nav: readonly HeaderNavItem[];
  /** Right-side call-to-action slot. */
  cta?: ReactNode;
  /** The drawer's top-row CTA; falls back to `cta`. */
  mobileCta?: ReactNode;
  homeHref: string;
  homeLabel: string;
  menuLabels: HeaderMenuLabels;
}

function BrandHeader({
  nav,
  cta,
  mobileCta,
  homeHref,
  homeLabel,
  menuLabels,
}: BrandHeaderProps) {
  return (
    <header
      data-slot="header"
      className="group/header fixed top-0 left-0 z-[60] w-full"
    >
      <HeaderBar
        nav={nav}
        cta={cta}
        linkComponent={Link}
        homeHref={homeHref}
        homeLabel={homeLabel}
        menuLabels={menuLabels}
      />
      <HeaderMobileMenu
        nav={nav}
        cta={cta}
        mobileCta={mobileCta}
        linkComponent={Link}
        menuLabels={menuLabels}
      />
      <HeaderBehavior />
    </header>
  );
}

// The wired header: nav items and the CTA cluster — route-owned actions
// (`HeaderActions`) left of the cabinet link.
export function Header({ locale }: { locale: Locale }) {
  // Server-side translation: this is a Server Component, so it reads the
  // catalogue directly rather than going through the client-side provider.
  const t = translate(locale);
  const cabinet = cabinetLink(t);
  return (
    <BrandHeader
      nav={localizeNav(NAV_ITEMS, locale, t)}
      homeHref={localePath(locale, "/")}
      homeLabel={t("a11y.homeLink", "EV Investment — home")}
      menuLabels={{
        open: t("a11y.openMenu", "Open menu"),
        close: t("a11y.closeMenu", "Close menu"),
        menu: t("a11y.siteMenu", "Site menu"),
      }}
      cta={
        <>
          <HeaderActions />
          <CabinetEntryTracker location="header">
            <HeaderBarCta link={cabinet} />
          </CabinetEntryTracker>
        </>
      }
      mobileCta={
        <CabinetEntryTracker location="menu">
          <HeaderMenuCta link={cabinet} />
        </CabinetEntryTracker>
      }
    />
  );
}
