import type { Metadata } from "next";

import { RemoteElement } from "@/shared/mfe";

// App surface, not a marketing page — keep it out of the search index.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Deep links (`?building=`) stay in the host URL, where the remote reads them.
export default function AnalyticsPage() {
  return (
    <RemoteElement
      tag="mfe-analytics-dashboard"
      scriptUrl="/mfe/analytics/dashboard.js"
      kind="page"
      className="block min-h-dvh"
    />
  );
}
