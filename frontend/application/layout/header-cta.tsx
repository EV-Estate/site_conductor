// The header's entry into the cabinet, SSR'd as plain markup so the homepage
// HTML carries a crawlable href to it. The cabinet is another app on its own
// host, so the link is a hard `<a>`, never `next/link`.
//
// uikit `Button` with `href`, not `asChild`: it renders a plain
// `<a data-slot="button">` with no Slot, so the §7 sibling-hydration trap (a
// Slot thing) does not apply. `data-cta` is what the CabinetEntryTracker reads
// to name the click in the funnel.
import { Button } from "@evinvest/uikit";
import type { HeaderCabinetLink } from "./header-shared";

// The header's type — the nav beside it is mono-tech, not the button's sans —
// and the solid focus ring: the button base ships a tinted `ring-ring/50`,
// which measures ~2:1 on these surfaces and misses the 3:1 floor.
const HEADER_BUTTON =
  "font-mono-tech text-xs tracking-wider focus-visible:ring-2 focus-visible:ring-ring";

// Ghost, not filled: the bar's only action, and it shares the row with the
// burger down to a 320px viewport — the label stays within 20 characters
// in every locale for the same reason.
export function HeaderBarCta({ link }: { link: HeaderCabinetLink }) {
  return (
    <Button
      href={link.href}
      variant="ghost"
      size="md"
      data-cta="cabinet"
      className={`text-ink-mid hover:text-primary-ink ${HEADER_BUTTON}`}
    >
      {link.label}
    </Button>
  );
}

// The drawer's top row: the same entry, full width. The system `outline`
// variant, not a hand-rolled primary-outline.
export function HeaderMenuCta({ link }: { link: HeaderCabinetLink }) {
  return (
    <Button
      href={link.href}
      variant="outline"
      size="md"
      data-cta="cabinet"
      className={`w-full ${HEADER_BUTTON}`}
    >
      {link.label}
    </Button>
  );
}
