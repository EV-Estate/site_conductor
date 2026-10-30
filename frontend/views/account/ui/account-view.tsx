"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { localePath, type Locale } from "@evinvest/i18n";
import { useT } from "@evinvest/i18n/react";
import { PageFrame, ResourceError, Skeleton } from "@evinvest/uikit";
import {
  conciergeEntry,
  fetchConciergeRegistry,
  type AccountSection,
} from "@evinvest/concierge";
import { AccountPage } from "@evinvest/concierge/react";

type Source =
  | { status: "loading" }
  | { status: "ready"; scriptUrl: string }
  | { status: "failed" };

// Concierge's element reads and writes everything itself, the signed-out state
// included; its links are cross-zone, so they stay hard navigations (no onNavigate).
export function AccountView({
  locale,
  section,
}: {
  locale: Locale;
  section: AccountSection | undefined;
}) {
  const t = useT();
  const router = useRouter();
  const [source, setSource] = useState<Source>({ status: "loading" });

  useEffect(() => {
    let live = true;
    // The page's own origin rather than the SDK's evinvest.ltd default, so a dev
    // server loads the bundles its own /api/auth rewrite serves.
    const prefix = `${location.origin}/api/auth/mfe/`;
    void fetchConciergeRegistry(`${prefix}registry.json`, {
      allowedPrefix: prefix,
    }).then(registry => {
      const entry = registry.ok
        ? conciergeEntry(registry.value, "account")
        : registry;
      if (!entry.ok) console.error(`account element: ${entry.error}`);
      if (live)
        setSource(
          entry.ok
            ? { status: "ready", scriptUrl: entry.value.scriptUrl }
            : { status: "failed" }
        );
    });
    return () => {
      live = false;
    };
  }, []);

  const loading = <Skeleton className="h-64 w-full" />;
  return (
    <PageFrame
      width="content"
      className="mx-auto px-4 py-10"
      title={t("account.title", "Account")}
    >
      {source.status === "ready" ? (
        <AccountPage
          scriptUrl={source.scriptUrl}
          section={section}
          onSection={s =>
            router.replace(`${localePath(locale, "/account")}?section=${s}`, {
              scroll: false,
            })
          }
          fallback={loading}
        />
      ) : source.status === "loading" ? (
        loading
      ) : (
        <ResourceError
          message={t("account.unavailable", "Your account could not be loaded")}
        />
      )}
    </PageFrame>
  );
}
