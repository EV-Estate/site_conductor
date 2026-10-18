// CI gate for the redirect and rewrite rules in next.config.ts.
//
// Three things here cannot be caught by a type or a lint — the config compiles
// either way — so each is asserted against Next's own matcher, substituting
// the way Next substitutes:
//   1. The retired landing and cabinet pages answer 404: no redirect (Next
//      consults redirects() first, so one stray match would beat the 404) and
//      a beforeFiles rewrite to a route nobody owns. Nothing else may be
//      caught — the zones' asset/API/MFE paths, auth, KYC, /wallet, /rea and
//      the old mail links keep working. No rule may point at another host.
//   2. The /en/* collapse (one canonical URL per page) stays off the retired
//      paths, which must 404 as themselves rather than 308 first.
//   3. The English afterFiles rewrite (site_conductor#229): an unprefixed
//      English page must reach app/[locale] in one pass, and a locale-prefixed
//      path must never be claimed by it.
import assert from "node:assert/strict";

// Next vendors this as CommonJS, so it has no named ESM exports.
import pathToRegexpModule from "next/dist/compiled/path-to-regexp/index.js";

const { pathToRegexp, compile } = pathToRegexpModule as unknown as {
  pathToRegexp: (src: string, keys: { name: string | number }[]) => RegExp;
  compile: (
    dest: string,
    opts?: { validate?: boolean }
  ) => (params: Record<string, unknown>) => string;
};

import { LOCALES } from "@evinvest/i18n";

import nextConfig from "../next.config.ts";

type Redirect = { source: string; destination: string; permanent?: boolean };
type Rewrite = { source: string; destination: string };
type Rewrites = { beforeFiles?: Rewrite[]; afterFiles?: Rewrite[]; fallback?: Rewrite[] };

const redirects = (await nextConfig.redirects!()) as Redirect[];
const rewrites = (await nextConfig.rewrites!()) as Rewrites;
const collapse = redirects.filter(r => r.source.startsWith("/en/"));

assert.equal(collapse.length, 1, "expected exactly one /en/* collapse rule");
const rule = collapse[0]!;

/** What a rule does to a path: the destination, or null when it does not match. */
function applyRule(r: { source: string; destination: string }, pathname: string): string | null {
  const keys: { name: string | number }[] = [];
  const re = pathToRegexp(r.source, keys);
  const m = re.exec(pathname);
  if (!m) return null;
  const params = Object.fromEntries(keys.map((k, i) => [k.name, m[i + 1]]));
  // `validate: false` is what Next itself passes when it resolves a redirect.
  // With validation on, a multi-segment capture is rejected and this harness
  // reports a break that production does not have.
  return compile(r.destination, { validate: false })(params);
}

const apply = (pathname: string) => applyRule(rule, pathname);

const collapses: [string, string][] = [
  ["/en/status", "/status"],
  ["/en/rea/listings", "/rea/listings"],
  // Siblings that merely start with a retired root's name are other pages.
  ["/en/cabinets", "/cabinets"],
  ["/en/cabinets/list", "/cabinets/list"],
  ["/en/teams", "/teams"],
];

// Retired: must reach the 404 rewrite as themselves, not be collapsed first.
const passesThrough = [
  "/en/team",
  "/en/publications/whitepaper",
  "/en/cabinet",
  "/en/cabinet/wallet",
  "/en/cabinet/login",
  "/en/whitepaper.pdf",
  "/en/llms.txt",
];

const failures: string[] = [];

for (const [from, to] of collapses) {
  let got: string | null | { error: string };
  try {
    got = apply(from);
  } catch (e) {
    got = { error: (e as Error).message };
  }
  if (typeof got !== "string" || got !== to) {
    failures.push(`${from} should collapse to ${to}, got ${JSON.stringify(got)}`);
  }
}

for (const from of passesThrough) {
  let got: string | null | { error: string };
  try {
    got = apply(from);
  } catch (e) {
    got = { error: (e as Error).message };
  }
  if (got !== null) {
    failures.push(`${from} must reach the 404 rewrite as itself, but the collapse claimed it (${JSON.stringify(got)})`);
  }
}

if (failures.length > 0) {
  console.error(`The /en/* collapse is wrong in ${failures.length} case(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    "\nA retired path caught by the collapse answers 308 instead of 404." +
      "\nSee RETIRED_PATH / NOT_RETIRED in next.config.ts."
  );
  process.exit(1);
}

console.log(`/en/* collapse OK — ${collapses.length} collapsed, ${passesThrough.length} left to the 404 rewrite.`);

// The English afterFiles rewrite (next.config.ts `rewrites()`, site_conductor#229).
//
// Since Next 16.4 an unprefixed English page must reach app/[locale] in one
// pass: left to the `fallback` rule, `/team` is first tried as locale "team",
// and the retry as `/en/team` loops forever on the RSC `_rsc` hash check, so
// every English soft navigation dies. The afterFiles rule fixes that, and it
// is the rule the comment above `rewrites()` warns about — an afterFiles rule
// that also claims a locale-prefixed path sends `/ru/team` to `/en/ru/team`
// (404). So it has to be narrow in both directions: every unprefixed page, and
// nothing that already names a locale, a zone, API space or Next's own files.
// Like the collapse, a wrong lookahead still compiles; only the matcher shows it.
const english = (rewrites.afterFiles ?? []).filter(r => r.destination.startsWith("/en/"));

/** The first English afterFiles rewrite that claims the path, or null. */
function rewrite(pathname: string): string | null | { error: string } {
  try {
    for (const r of english) {
      const got = applyRule(r, pathname);
      if (got !== null) return got;
    }
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const rewritten: [string, string][] = [
  ["/status", "/en/status"],
  ["/foo/x", "/en/foo/x"],
  // Siblings that merely start with an excluded root are ordinary pages.
  ["/cabinets", "/en/cabinets"],
  ["/english", "/en/english"],
  ["/apis/x", "/en/apis/x"],
];

const leftAlone = [
  // `/` stays with the fallback rule.
  "/",
  // Already locale-prefixed: must reach app/[locale] as itself.
  ...LOCALES.flatMap(locale => [`/${locale}`, `/${locale}/team`]),
  "/en/cabinet/x",
  // Zones, API space and Next's own files keep their pre-16.4 path.
  "/cabinet",
  "/cabinet/x",
  "/rea",
  "/rea/x",
  "/api/x",
  "/api/auth/session",
  "/_next/static/chunks/x.js",
];

const rewriteFailures: string[] = [];

for (const [from, to] of rewritten) {
  const got = rewrite(from);
  if (got !== to) {
    rewriteFailures.push(`${from} should be rewritten to ${to} before dynamic routes, got ${JSON.stringify(got)}`);
  }
}

for (const from of leftAlone) {
  const got = rewrite(from);
  if (got !== null) {
    rewriteFailures.push(`${from} must not be rewritten by the English afterFiles rule, got ${JSON.stringify(got)}`);
  }
}

if (rewriteFailures.length > 0) {
  console.error(`The English afterFiles rewrite is wrong in ${rewriteFailures.length} case(s):\n`);
  for (const f of rewriteFailures) console.error(`  ${f}`);
  console.error(
    "\nWithout it every English soft navigation loops on 307s (site_conductor#229);" +
      "\nclaiming a prefixed path sends it to /en/<locale>/… (404). See the comment on rewrites()."
  );
  process.exit(1);
}

console.log(`English afterFiles rewrite OK — ${rewritten.length} rewritten, ${leftAlone.length} left alone.`);

// Old mail links (site_conductor#270) and the wallet zone path (#271). Neither
// may be caught by the /en/* collapse or the English rewrite above, and the
// notifications redirect must stay permanent so a one-click POST keeps its body.
const notif = redirects.filter(r => r.source.startsWith("/notifications/"));
assert.equal(notif.length, 1, "expected exactly one /notifications/* redirect");
assert.equal(notif[0]!.permanent, true, "/notifications/* must be a 308");
const notifCases: [string, string][] = [
  ["/notifications/unsubscribe", "/api/auth/notifications/unsubscribe"],
  ["/notifications/confirm", "/api/auth/notifications/confirm"],
  ["/notifications/a/b", "/api/auth/notifications/a/b"],
];
for (const [from, to] of notifCases) {
  assert.equal(applyRule(notif[0]!, from), to, `${from} should redirect to ${to}`);
}
assert.equal(applyRule(notif[0]!, "/notificationsx/unsubscribe"), null, "sibling must not match");

const walletRule = (rewrites.beforeFiles ?? []).find(r => r.source === "/wallet/:path*");
// Env unset ⇒ zone disabled and no rewrite, so only assert when it is wired.
if (walletRule) {
  for (const [from, to] of [
    ["/wallet/mfe/registry.json", "/wallet/mfe/registry.json"],
    ["/wallet/pay", "/wallet/pay"],
  ] as const) {
    // The destination carries a host ("http://…"), which compile() reads as a
    // parameter; assert on the path part, which is what the rule decides.
    const path = new URL(walletRule.destination.replace(":path*", "x")).pathname;
    assert.equal(path, "/wallet/x", "wallet rewrite must keep the /wallet prefix");
    const got = applyRule({ source: walletRule.source, destination: "/wallet/:path*" }, from);
    assert.equal(got, to, `${from} should reach the cabinet zone at ${to}`);
  }
}
console.log(`Notifications redirect OK — ${notifCases.length} cases; wallet rewrite ${walletRule ? "OK" : "skipped (cabinet zone unset)"}.`);

// Retired pages answer 404 (decision 2026-10-18: no redirect to the landing's
// host). Next consults redirects() first, then beforeFiles rewrites; a request
// is a 404 here when no redirect claims it and a beforeFiles rule sends it to
// the unowned GONE route.
const GONE = "/_retired/gone";
const gone = (rewrites.beforeFiles ?? []).filter(r => r.destination === GONE);
assert.ok(gone.length > 0, "expected beforeFiles rules rewriting to the unowned 404 route");

const redirectedTo = (pathname: string): string | null => {
  for (const r of redirects) {
    const got = applyRule(r, pathname);
    if (got !== null) return got;
  }
  return null;
};
const answers404 = (pathname: string): boolean => gone.some(r => applyRule(r, pathname) !== null);

assert.ok(
  redirects.every(r => !/^[a-z][a-z0-9+.-]*:/i.test(r.destination)),
  "no redirect may leave this origin (no invest-host redirect, by decision)"
);

const retiredBases = [
  "/publications",
  "/publications/whitepaper",
  "/publications/some-slug/cover.jpg",
  "/publications/some-slug.pdf",
  "/team",
  "/hiring",
  "/hiring/some-role",
  "/contact",
  "/privacy",
  "/terms",
  "/risk",
  "/apps",
  "/apps/rea/listings",
  "/blogs",
  "/blogs/some-post",
  "/whitepaper",
  "/whitepaper.pdf",
  "/whitepaper.dark.html",
  "/whitepaper.light.html",
  "/whitepaper/x",
  "/llms.txt",
  "/cabinet",
  "/cabinet/login",
  "/cabinet/admin/revenue",
];
// The same pages under every locale prefix, `/<locale>/cabinet/*` included.
const retired = [
  ...retiredBases,
  ...LOCALES.flatMap(locale => retiredBases.map(p => `/${locale}${p}`)),
];

const stays = [
  "/",
  ...LOCALES.map(locale => `/${locale}`),
  "/admin",
  "/api/auth/login",
  "/api/auth/session",
  "/api/callback/auth/google",
  "/api/kyc/start",
  "/api/kyc/callback/didit",
  "/api/zone-error",
  "/api/mfe-registry",
  "/wallet/mfe/registry.json",
  "/wallet/pay",
  "/cabinet/_next/static/chunks/x.js",
  "/cabinet/api/session",
  "/cabinet/mfe/account-chip.js",
  "/rea",
  "/rea/",
  "/rea/assets/app.js",
  "/rea/api/x",
  "/notifications/unsubscribe",
  "/robots.txt",
  "/sitemap.xml",
  "/shell/manifest.json",
  // Siblings that merely start with a retired name are not retired.
  "/cabinets",
  "/teams",
  "/termsheet",
  "/whitepapers",
];

const retiredFailures: string[] = [];
for (const path of retired) {
  const redirect = redirectedTo(path);
  if (redirect !== null) retiredFailures.push(`${path} must answer 404 but a redirect claims it (-> ${redirect})`);
  if (!answers404(path)) retiredFailures.push(`${path} must answer 404 but no rewrite sends it to the unowned route`);
}
for (const path of stays) {
  if (answers404(path)) retiredFailures.push(`${path} must keep working but the 404 rewrite claims it`);
  const redirect = redirectedTo(path);
  // /notifications/* (asserted below) and the bare /en -> / are the only
  // redirects a path outside the retired set may get, both on this origin.
  if (redirect !== null && !path.startsWith("/notifications/") && path !== "/en") {
    retiredFailures.push(`${path} must not redirect, got ${redirect}`);
  }
}
if (retiredFailures.length > 0) {
  console.error(`The 404 rules are wrong in ${retiredFailures.length} case(s):\n`);
  for (const f of retiredFailures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`404 rules OK — ${retired.length} retired paths answer 404, ${stays.length} others untouched.`);
