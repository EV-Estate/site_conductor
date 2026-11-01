import { RemoteElement } from "@/shared/mfe";
import { Reveal } from "@/shared/ui/motion";

// Served live by analytics under this host's /mfe/analytics; the bundle derives its API and asset origin from its own URL.
const ANALYTICS_OVERVIEW = {
  tag: "mfe-analytics-overview",
  scriptUrl: "/mfe/analytics/overview.js",
} as const;

// `id="portfolio"` is the hero CTA's scroll target and the /#portfolio nav anchor,
// held by the host wrapper so it lands whether or not the remote has upgraded yet.
export function Portfolio() {
  return (
    <div id="portfolio">
      {/* `from="none"` on purpose: a transform here would make this element the
          containing block for any `position: fixed` the remote paints, so the
          section fades in without moving. */}
      <Reveal from="none">
        <RemoteElement tag={ANALYTICS_OVERVIEW.tag} scriptUrl={ANALYTICS_OVERVIEW.scriptUrl} kind="component" />
      </Reveal>
    </div>
  );
}
