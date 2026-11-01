"use client";

import type { MouseEvent, ReactNode } from "react";
import { useLocale } from "@evinvest/i18n/react";
import { useAnalytics } from "@/features/analytics";

/** Where in the shell the cabinet entry sits — the funnel's `location` prop. */
export type CabinetEntryLocation = "header" | "menu";

// The header runs no experiment (no key in shared/config/experiments.ts), so
// the schema's `variant` is the control arm until one is declared there.
const HEADER_VARIANT = "control";

// Client island around the header's cabinet link (header-cta.tsx), which stays
// Server Component markup: the CTA event hangs on a delegated listener over the
// slot instead of on the link itself. A link names itself through `data-cta`.
export function CabinetEntryTracker({
  location,
  children,
}: {
  location: CabinetEntryLocation;
  children: ReactNode;
}) {
  const capture = useAnalytics();
  const locale = useLocale();

  // Capture phase: runs before the browser starts the hard navigation the link
  // triggers. Delivery across that navigation is posthog's
  // pagehide flush.
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target instanceof Element ? e.target : null;
    const link = target?.closest<HTMLAnchorElement>("a[data-cta]");
    if (!link) return;
    capture("cta_clicked", {
      cta: link.dataset.cta ?? "cabinet",
      location,
      variant: HEADER_VARIANT,
      locale,
    });
  };

  return (
    <div
      className="contents"
      data-cta-location={location}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}
