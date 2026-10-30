import type { Metadata } from "next";
import { ACCOUNT_SECTIONS } from "@evinvest/concierge";
import { DEFAULT_LOCALE, isLocale } from "@evinvest/i18n";
import { translate } from "@/shared/config/i18n";
import { AccountView } from "@/views/account";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = translate(isLocale(locale) ? locale : DEFAULT_LOCALE);
  return {
    title: t("account.title", "Account"),
    robots: { index: false, follow: false },
  };
}

// `?section=` is also what concierge's own links to this page carry.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const [{ locale }, { section }] = await Promise.all([params, searchParams]);
  return (
    <AccountView
      locale={isLocale(locale) ? locale : DEFAULT_LOCALE}
      section={ACCOUNT_SECTIONS.find(s => s === section)}
    />
  );
}
