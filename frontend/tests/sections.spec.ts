import { cookieName } from "@evinvest/experiments";
import { expect, test, type Page } from "@playwright/test";

import { experiments } from "../shared/config/experiments";
import { CABINET_URL } from "../shared/config/site";

// One visual-regression baseline per section of the site. `name` names the
// screenshot file (__screenshots__/<name>.png); `selector` locates the section.
// The anchored content sections (hero, research, team) are reachable by their
// nav hash, e.g. <baseURL>/#team — those use an id selector. The
// page chrome (header/footer) has no anchor, so it's keyed by tag.
//
// No portfolio baseline: the section is the analytics service's tile, loaded live
// from its own origin, so its pixels are not ours to pin.
//
// `on` lists the viewports (playwright.config.ts projects, matched by tag) a
// section is baselined at. Mobile covers the page chrome and the hero — the
// surfaces the funnel work reshapes below `sm` (issue #205); the content
// sections stay desktop-only until their phone layout is worth a baseline of
// its own.
//
// Adding a section to the site = adding one line here. Nothing else changes.
const SECTIONS = [
  { name: "header", selector: "header", on: ["desktop", "mobile"] },
  { name: "hero", selector: "#hero", on: ["desktop", "mobile"] },
  { name: "research", selector: "#research", on: ["desktop"] },
  { name: "partners", selector: "#partners", on: ["desktop"] },
  {
    name: "cabinet-tour",
    selector: "#cabinet-tour",
    on: ["desktop", "mobile"],
  },
  { name: "team", selector: "#team", on: ["desktop"] },
  { name: "footer", selector: "footer", on: ["desktop", "mobile"] },
] as const;

const tags = (on: readonly string[]) => on.map(viewport => `@${viewport}`);

// The hero scales its background with window.scrollY; pinning the scroll
// position makes its zoom (and the header's blur-on-scroll state) deterministic.
// Top-of-page for the chrome sections, the element itself otherwise.
const PIN_TO_TOP = new Set<string>(["header", "hero"]);

// A/B experiments assign per fresh context (weighted random, sticky cookie), so
// an unpinned run screenshots a random variant. Pin every experiment to the
// variant the committed baselines were captured from.
const BASELINE_VARIANTS: { [K in keyof typeof experiments]: string } = {
  hero: "a",
  hero_headline: "b",
  hero_cta: "a",
  hero_as_of: "a",
  team_bio_shade: "a",
  team_office: "a",
};
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies(
    Object.entries(BASELINE_VARIANTS).map(([key, value]) => ({
      name: cookieName(key),
      value,
      url: baseURL,
    }))
  );
});

// Web fonts shift glyph metrics, and the CloudFront background images load
// over the network rather than via <img> decode — a baseline is only
// comparable once both have landed.
async function gotoHome(page: Page) {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
}

// Opacity reaching 1 is not the same as the motion being over: a staggered
// group's last child, or a split headline's last word, can still be sliding
// while the first is already opaque. `motion` drives these through the Web
// Animations API, so waiting for the document to have nothing running is
// exact — Playwright's own `animations: "disabled"` only freezes CSS.
// Looping decoration (a spinner, a pulse) never finishes and must not be
// waited on — only one-shot entrances count as "still settling". The header
// drawer's CSS transitions surface through the same API, so this covers them too.
async function waitForMotionToSettle(page: Page) {
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .every(
          animation =>
            animation.playState !== "running" ||
            animation.effect?.getComputedTiming().iterations === Infinity
        ),
    undefined,
    { timeout: 15_000 }
  );
}

for (const { name, selector, on } of SECTIONS) {
  test(`- mismatch on: ${name}`, { tag: tags(on) }, async ({ page }) => {
    await gotoHome(page);

    const section = page.locator(selector);
    await expect(section).toBeVisible();

    if (PIN_TO_TOP.has(name)) {
      await page.evaluate(() => window.scrollTo(0, 0));
    } else {
      // A section taller than the viewport (any long section on mobile) keeps
      // its lower Reveals un-intersected after a top-aligned scroll: their
      // once-only observers never fire and the wait below reads a blank. Walk
      // from the page top to the section's end in viewport-sized steps so
      // every observer above and inside it has seen the viewport (and every
      // lazy image above it has loaded — one that finishes after the capture
      // starts would shift the page under the fixed chrome), then bring the
      // section back into view for the capture — `once` keeps them revealed.
      await section.evaluate(async el => {
        const pause = () => new Promise(r => setTimeout(r, 100));
        const step = Math.max(200, window.innerHeight - 200);
        const bottom =
          el.getBoundingClientRect().top +
          window.scrollY +
          el.getBoundingClientRect().height;
        for (let y = 0; y < bottom; y += step) {
          window.scrollTo({ top: y, behavior: "instant" });
          await pause();
        }
        // Lazy images below the fold never complete, so only wait for those
        // the walk has passed — bounded, in case one of them is broken.
        const passed = Array.from(document.images).filter(
          img =>
            !img.complete &&
            img.getBoundingClientRect().top + window.scrollY < bottom
        );
        await Promise.race([
          Promise.all(
            passed.map(
              img =>
                new Promise<void>(r => {
                  img.onload = img.onerror = () => r();
                })
            )
          ),
          new Promise(r => setTimeout(r, 3000)),
        ]);
      });
      // Playwright's own scroll (the protocol one `toHaveScreenshot` repeats
      // before capturing) ignores CSS scroll-padding, a DOM scrollIntoView
      // honours it — end on the former so the capture's scroll is a no-op.
      await section.scrollIntoViewIfNeeded();
    }
    // Let the scroll-driven transform settle to its resting frame.
    await page.waitForTimeout(150);

    // Reveal wrappers SSR at opacity:0 and only animate in client-side; a dead
    // bundle (dev server mid-restart, chunk 404s) screenshots a structurally
    // valid but blank section. Fail loud instead of diffing a void.
    await page
      .waitForFunction(
        sel => {
          const root = document.querySelector(sel);
          if (!root) return false;
          // A responsive-hidden branch (the mobile carousel at a desktop
          // viewport) is never intersected, so its Reveal holds opacity:0 for
          // good. Unrendered means nothing to reveal, not a dead bundle.
          return !Array.from(root.querySelectorAll("[style*='opacity']")).some(
            el =>
              el.getClientRects().length > 0 &&
              getComputedStyle(el).opacity === "0"
          );
        },
        selector,
        { timeout: 15_000 }
      )
      .catch(() => {
        throw new Error(
          `${name}: content never revealed — client bundle likely never hydrated`
        );
      });

    await waitForMotionToSettle(page);

    if (name === "header") {
      // The whole bar at both widths. Its cabinet entry is a static link
      // SSR'd into the markup (application/layout/header-cta.tsx), not a
      // network-served widget, so nothing in it depends on another service
      // and there is nothing to clip away. The closed drawer is `fixed`, so
      // it adds nothing to the header's own box.
      await expect(section).toHaveScreenshot(`${name}.png`);
    } else {
      // Fixed chrome overlays whatever sits at the viewport edges — the header
      // (it has its own baseline above), Next's
      // dev indicator and the A/B dev panel — and whether it lands inside the
      // element depends on the scroll offset the capture ends on, which is not
      // stable across runs. Hide all three for the capture instead of masking:
      // a mask still records where the chrome was.
      await page.addStyleTag({
        content:
          "header, nextjs-portal, div[style*='2147483647'] { visibility: hidden !important; }",
      });
      await expect(section).toHaveScreenshot(`${name}.png`);
    }
  });
}

// The open drawer is the other half of the mobile header: `data-menu-open` on
// the header root slides the aside in and reveals the scrim (CSS transitions
// on `translate` + `visibility`, no React). Viewport-sized on purpose — the
// composition of scrim, dimmed page and panel is what a reader sees, and the
// panel alone would hide a scrim regression.
test("- mismatch on: header-drawer", { tag: ["@mobile"] }, async ({ page }) => {
  await gotoHome(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForMotionToSettle(page);

  const toggle = page.getByRole("button", { name: "Open menu" });
  // The toggle is wired by the deferred `header-behavior` script; a click that
  // lands before it attaches is a no-op, so retry until the state flips.
  await expect(async () => {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true", {
      timeout: 500,
    });
  }).toPass({ timeout: 10_000 });
  // The aside carries `aria-label="Site menu"` → role `complementary`.
  const drawer = page.getByRole("complementary", { name: "Site menu" });
  await expect(drawer).toBeVisible();
  await waitForMotionToSettle(page);

  await expect(page).toHaveScreenshot("header-drawer.png");
});

// The funnel's first step (EV-Main/site_conductor#205): a signed-out reader
// must see a way into the cabinet without scrolling or opening the menu.
// "Primary" is whichever of the two entries the page ships first — the
// header's `data-cta="cabinet"` link (header-cta.tsx, the name
// CabinetEntryTracker reports) or the hero's own link to the cabinet — so the
// assertion holds through either. The drawer's copy of the header link is
// `visibility: hidden` while closed, which the visible filter drops. Attribute
// and `href` rather than an accessible name because the copy is translated
// and the destination is the contract: both entries are hard links to
// CABINET_URL.
for (const viewport of ["desktop", "mobile"] as const) {
  test(
    `- primary cabinet CTA sits inside the first ${viewport} viewport`,
    { tag: [`@${viewport}`] },
    async ({ page }) => {
      await gotoHome(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await waitForMotionToSettle(page);

      const cta = page
        .locator(
          `header a[data-cta="cabinet"], #hero a[href="${CABINET_URL}"]`
        )
        .filter({ visible: true })
        .first();
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", CABINET_URL);
      // `ratio: 1` — the whole button, not a sliver peeking above the fold.
      await expect(cta).toBeInViewport({ ratio: 1 });
    }
  );
}

// Issue 39's regression gate. The portfolio section is the one place on the
// landing where the copy belongs to another repo, and it was English under every
// locale's chrome. The live bundle resolves the locale itself off the page's `lang`
// (ev_lib::mfe::host_locale); nothing is passed to it, a prop or an attribute
// would arrive too late.
//
// Text, not a screenshot: the point is the language, and a per-locale baseline
// would have to be re-captured on every copy edit in analytics.
const RU_PORTFOLIO = "Почему Куинён?";

test(
  "- portfolio reads Russian on /ru",
  { tag: ["@desktop"] },
  async ({ page }) => {
    await page.goto("/ru");
    expect(await page.evaluate(() => document.documentElement.lang)).toBe("ru");

    const section = page.locator("#portfolio");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByText(RU_PORTFOLIO).first()).toBeVisible({
      timeout: 15_000,
    });
  }
);
