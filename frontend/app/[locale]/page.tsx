import type { Metadata } from "next";
import { DEFAULT_LOCALE, isLocale } from "@evinvest/i18n";
import { metadata as baseMetadata } from "@/application/metadata";
import { fontSourceSerif } from "@/application/styles/fonts/source-serif";
import { translate } from "@/shared/config/i18n";
import { SITE } from "@/shared/config/site";
import { ComingSoonView } from "@/views/coming-soon";
// Global stylesheet of this page only: the page's layout values, scoped under
// its `data-surface` (see the file's header).
import "@/application/styles/coming-soon.css";

// The landing moved to its own host (next.config.ts `redirects()`); this origin
// keeps one page. Every locale renders it — the brand line stays English in
// all of them — so every locale canonicalises to `/` and the sitemap lists `/`
// alone. Per-locale hreflang would announce five URLs for one page.
//
// `title: { absolute }` bypasses the `%s | EV Investment` template, which
// would otherwise stamp the brand twice.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = translate(isLocale(locale) ? locale : DEFAULT_LOCALE);
  const title = `${SITE.name}: ${t("meta.comingSoon.title", "Expected value, arriving soon")}`;
  const description = t(
    "meta.comingSoon.description",
    "Expected Value Investment — the new site is on its way."
  );
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { ...baseMetadata.openGraph, title, description, url: "/" },
    twitter: { ...baseMetadata.twitter, title, description },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ComingSoonView
      locale={isLocale(locale) ? locale : DEFAULT_LOCALE}
      fontClassName={fontSourceSerif.variable}
    />
  );
}
