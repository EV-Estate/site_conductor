"use client";

import { ArrowRight } from "lucide-react";
import { useLocale, useT } from "@evinvest/i18n/react";
import { Button } from "@evinvest/uikit";

import { useAnalytics } from "@/features/analytics";
import { CABINET_URL } from "@/shared/config/site";

// The tour runs no experiment, so the funnel schema's `variant` is the control
// arm — the same convention as the research footer.
const CABINET_TOUR_VARIANT = "control";

/**
 * Client island — the section's single link, and the page's only one below the
 * hero. Outline, not filled: the hero already made the ask, and this block is
 * meant to let the reader conclude for themselves (owner feedback, 2026-09-18).
 *
 * It points at the cabinet root, not the login page: a signed-in reader lands
 * on the screens they just saw, and a newcomer is bounced to login by the
 * cabinet itself. That bounce is the door.
 *
 * A hard link (`Button href` renders a plain `<a>`), never `next/link`: the
 * cabinet is a separate app on its own host.
 */
export function CabinetTourCta() {
  const t = useT();
  const locale = useLocale();
  const capture = useAnalytics();

  return (
    <Button
      variant="outline"
      href={CABINET_URL}
      size="lg"
      className="border-border bg-transparent text-ink shadow-none hover:bg-ink hover:text-brand transition-colors font-mono-tech text-xs tracking-widest uppercase rounded-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() =>
        capture("cta_clicked", {
          cta: "cabinet",
          location: "cabinet_tour",
          variant: CABINET_TOUR_VARIANT,
          locale,
        })
      }
    >
      {t("home.cabinetTour.cta", "See your cabinet")}
      <ArrowRight className="size-4" aria-hidden />
    </Button>
  );
}
