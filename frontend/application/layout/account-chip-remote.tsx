import type { Locale } from "@evinvest/i18n";
import { translate } from "@/shared/config/i18n";
import { CabinetEntryTracker } from "./cabinet-entry-tracker";
import { HeaderBarCta, HeaderMenuCta } from "./header-cta";
import { authLinks } from "./nav-items";

// The two placements of the cabinet entries in the shell, each wrapped in the
// entry tracker with its funnel `location`. There is no account chip any more:
// the cabinet lives on invest.evinvest.ltd, and a chip served from the old
// /cabinet mount would die with it. Kept here so the document only composes
// them and the header/menu split lives in one place.
export function HeaderAccountSlot({ locale }: { locale: Locale }) {
  return (
    <CabinetEntryTracker location="header">
      <HeaderBarCta links={authLinks(translate(locale))} />
    </CabinetEntryTracker>
  );
}

export function MenuAccountSlot({ locale }: { locale: Locale }) {
  return (
    <CabinetEntryTracker location="menu">
      <HeaderMenuCta links={authLinks(translate(locale))} />
    </CabinetEntryTracker>
  );
}
