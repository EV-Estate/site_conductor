import type { Metadata } from "next";

import { RemoteElement } from "@/shared/mfe";
import { findMfe } from "@/shared/mfe/registry";

// App surface, not a marketing page — keep it out of the search index.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// The element owns the whole page; deep links (`?building=`) stay in the host
// URL, where the remote reads them.
export default async function DataPage() {
  const entry = await findMfe("real-estate.data");
  // The registry is in-repo static data; a missing or misfiled entry is a broken build.
  if (entry?.kind !== "page")
    throw new Error("real-estate.data missing from mfe-registry.json as a page");

  return (
    <RemoteElement
      tag={entry.tag}
      scriptUrl={entry.scriptUrl}
      kind={entry.kind}
      className="block min-h-dvh"
    />
  );
}
