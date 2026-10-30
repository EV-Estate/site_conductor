// CI gate for the redirect and rewrite rules in next.config.ts.
//
// Three things here cannot be caught by a type or a lint — the config compiles
// either way — so each is asserted against Next's own matcher, substituting
// the way Next substitutes:
//   1. The retired landing pages answer 404: no redirect (Next
//      consults redirects() first, so one stray match would beat the 404) and
//      a beforeFiles rewrite to a route nobody owns. Nothing else may be
//      caught. No rule may point at another host.
//   2. The /en/* collapse (one canonical URL per page) stays off the retired
//      paths, which must 404 as themselves rather than 308 first.
//   3. The English afterFiles rewrite (site_conductor#229): an unprefixed
//      English page must reach app/[locale] in one pass, and a locale-prefixed
//      path must never be claimed by it.
//   4. The old /rea zone URLs land on /data.
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
  ["/en/data", "/data"],
  // Siblings that merely start with a retired root's name are other pages.
  ["/en/teams", "/teams"],
  ["/en/teams/list", "/teams/list"],
];

// Retired pages must reach the 404 rewrite as themselves, not be collapsed
// first.
const passesThrough = [
  "/en/team",
  "/en/publications/whitepaper",
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
      "\nSee RETIRED_PATH / NOT_COLLAPSED in next.config.ts."
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
// nothing that already names a locale, API space or Next's own files.
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
  ["/data", "/en/data"],
  // Siblings that merely start with an excluded root are ordinary pages.
  ["/english", "/en/english"],
  ["/apis/x", "/en/apis/x"],
];

const leftAlone = [
  // `/` stays with the fallback rule.
  "/",
  // Already locale-prefixed: must reach app/[locale] as itself.
  ...LOCALES.flatMap(locale => [`/${locale}`, `/${locale}/team`]),
  // API space and Next's own files keep their pre-16.4 path.
  "/api/x",
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

// The old /rea zone URLs. Next carries the query (`/rea/?building=x` →
// `/data?building=x`) itself, which no rule here can express.
const rea = redirects.filter(r => r.destination === "/data");
assert.equal(rea.length, 1, "expected exactly one /rea redirect");
assert.equal(rea[0]!.permanent, true, "/rea must be a 308");
const reaCases = ["/rea", "/rea/", "/rea/listings", "/rea/a/b"];
for (const from of reaCases) {
  assert.equal(applyRule(rea[0]!, from), "/data", `${from} should redirect to /data`);
}
assert.equal(applyRule(rea[0]!, "/reax"), null, "sibling must not match");
console.log(`/rea redirect OK — ${reaCases.length} cases.`);

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
];
// The same pages under every locale prefix.
const retired = [
  ...retiredBases,
  ...LOCALES.flatMap(locale => retiredBases.map(p => `/${locale}${p}`)),
];

const stays = [
  "/",
  ...LOCALES.map(locale => `/${locale}`),
  "/data",
  "/ru/data",
  "/mfe/data/mfe-real-estate-data.js",
  "/api/mfe-registry",
  "/rea",
  "/rea/listings",
  "/robots.txt",
  "/sitemap.xml",
  // Siblings that merely start with a retired name are not retired.
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
  // /rea (asserted above) and the bare /en -> / are the only redirects a path
  // outside the retired set may get, both on this origin.
  if (redirect !== null && !path.startsWith("/rea") && path !== "/en") {
    retiredFailures.push(`${path} must not redirect, got ${redirect}`);
  }
}
if (retiredFailures.length > 0) {
  console.error(`The 404 rules are wrong in ${retiredFailures.length} case(s):\n`);
  for (const f of retiredFailures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`404 rules OK — ${retired.length} retired paths answer 404, ${stays.length} others untouched.`);
