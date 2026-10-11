// THE header behavior — one implementation for both hosts: injected into zone
// HTML by the proxy and loaded by the conductor's own layout (the markup in
// application/layout/header.tsx ships no state). Zero imports; built to a
// content-hashed IIFE by scripts/build-shell.mts. All it does: toggle
// `data-scrolled` / `data-menu-open` / `data-session` on the root.
(() => {
  // The session state as last confirmed by /api/auth/session, kept for the
  // pre-paint stamp (scripts/session-stamp.ts) to replay on the next hard load.
  // The key and its two values are the whole contract between the scripts —
  // neither can import the other. Storage may throw (private modes); a missed
  // write only means the next load starts from the signed-out default.
  const SESSION_KEY = "ev.session";
  const remember = (state: "authenticated" | "anonymous") => {
    try {
      localStorage.setItem(SESSION_KEY, state);
    } catch {
      // See above.
    }
  };
  // The account chip's cached identity (banking,
  // entities/user/model/identity-cache.ts): v2 in localStorage, v1 in
  // sessionStorage. Copies of its keys, not an import — this script has none.
  // Left behind after a sign-out here, the next signed-in paint on this device
  // would show the previous account's name and initials until the profile read
  // corrects it, and a different person may be the one signing in.
  const forgetIdentity = () => {
    // Separately: one storage throwing must not spare the other.
    try {
      localStorage.removeItem("ev.cabinet.account-chip.v2");
    } catch {
      // Same private-mode caveat as `remember`.
    }
    try {
      sessionStorage.removeItem("ev.cabinet.account-chip");
    } catch {
      // Ditto.
    }
  };

  const readCookie = (name: string): string | null => {
    const prefix = `${name}=`;
    const found = document.cookie
      .split("; ")
      .find(entry => entry.startsWith(prefix));
    if (!found) return null;
    try {
      return decodeURIComponent(found.slice(prefix.length));
    } catch {
      // A malformed `%` escape throws, and the caller has already disabled
      // the sign-out button — a throw here would leave it stuck. Treat it as
      // no token: the request goes out bare and the server answers 403.
      return null;
    }
  };

  const header = document.querySelector<HTMLElement>(
    'header[data-slot="header"]'
  );
  if (!header) return;

  const onScroll = () =>
    window.scrollY > 50
      ? header.setAttribute("data-scrolled", "")
      : header.removeAttribute("data-scrolled");
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // The static markup has no session awareness of its own: it ships the
  // signed-out pair visible, the account chip and the drawer's sign-out button
  // hidden. One read of /api/auth/session decides all three — `data-session`
  // on the root flips the pair and the chip through their CSS variants, and
  // the sign-out button's `hidden` is cleared here because a hidden attribute
  // cannot be styled off. Nothing is stamped on a failed read: the pair stays,
  // which is the right guess for a visitor whose session cannot be confirmed.
  // Before this answers, the root may already carry the previous load's state
  // from the pre-paint stamp; this read overwrites it either way, and records
  // the fresh answer for the next load.
  const signoutBtn = header.querySelector<HTMLElement>(
    '[data-action="signout"]'
  );
  fetch("/api/auth/session")
    .then(r => r.json())
    .then((s: { authenticated?: boolean }) => {
      const authenticated = s?.authenticated === true;
      const state = authenticated ? "authenticated" : "anonymous";
      header.setAttribute("data-session", state);
      remember(state);
      if (authenticated && signoutBtn) signoutBtn.hidden = false;
    })
    .catch(() => {});

  // The drawer stays mounted and is hidden with `visibility`, which already
  // takes it out of the tab order and the accessibility tree — so open/close
  // needs no `inert` or `aria-hidden` bookkeeping. What CSS cannot do is move
  // focus, so that part is here: into the drawer on open, back to the trigger
  // on close, or a keyboard user is left focused on a button behind a scrim.
  const setOpen = (open: boolean) => {
    const toggle = header.querySelector<HTMLElement>(
      '[data-menu-toggle="open"]'
    );
    if (open) header.setAttribute("data-menu-open", "");
    else header.removeAttribute("data-menu-open");
    document.body.style.overflow = open ? "hidden" : "";
    toggle?.setAttribute("aria-expanded", String(open));

    if (open)
      // Next frame: the drawer is `visibility: hidden` until the style change
      // lands, and focus() on a hidden element is a no-op.
      requestAnimationFrame(() =>
        header
          .querySelector<HTMLElement>(
            '[data-slot="header-mobile-overlay"] [data-menu-toggle="close"]'
          )
          ?.focus()
      );
    else if (header.contains(document.activeElement)) toggle?.focus();
  };

  header.addEventListener("click", e => {
    const target = e.target as Element;
    const toggle = target.closest("[data-menu-toggle]");
    if (toggle)
      return setOpen(toggle.getAttribute("data-menu-toggle") === "open");
    // Sign-out handler: POSTs /api/auth/logout (rewritten to concierge) with
    // the double-submit CSRF token concierge checks: `x-ev-csrf` must equal the
    // readable `ev_csrf` cookie. Prefer the `__Host-` cookie so a
    // subdomain-planted plain `ev_csrf` cannot shadow it; the bare name is dev.
    // Same reading as banking's cabinet/frontend/shared/lib/csrf-client.ts —
    // this script has zero imports, so it is a copy, not a shared module.
    //
    // Only a 2xx means the session is gone. Flipping the remembered state or
    // leaving the page on any other answer would show a signed-out header over
    // a live session, so on failure the button simply becomes clickable again
    // and the drawer stays open on it. On success the remembered state flips
    // before navigating, so the home page does not paint the (now empty) chip
    // slot off a stale stamp, and the chip's cached identity goes with it. The
    // chip's own sign-out (banking's element) cannot touch `ev.session`; there
    // the next page's read corrects the stamp later.
    // Runs before the delegated-close, which would otherwise shut the drawer.
    const signout = target.closest<HTMLButtonElement>(
      'button[data-action="signout"]'
    );
    if (signout) {
      if (signout.disabled) return;
      const failed = header.querySelector<HTMLElement>(
        '[data-slot="signout-error"]'
      );
      signout.disabled = true;
      signout.setAttribute("aria-busy", "true");
      // Cleared per attempt, so a retry that fails again re-reveals it and the
      // alert role announces it again.
      if (failed) failed.hidden = true;
      const csrf = readCookie("__Host-ev_csrf") ?? readCookie("ev_csrf");
      fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-ev-csrf": csrf } : {}),
        },
      })
        .then(r => {
          if (!r.ok) throw new Error(`logout answered ${r.status}`);
          remember("anonymous");
          forgetIdentity();
          window.location.href = "/";
        })
        .catch(() => {
          signout.disabled = false;
          signout.removeAttribute("aria-busy");
          // Without it a failed sign-out looks like a button that did nothing,
          // and the reader may walk away believing the session is closed.
          if (failed) failed.hidden = false;
        });
      return;
    }
    // Delegated close: any link/button inside the open overlay dismisses it —
    // except the account chip's own controls. Its trigger and panel buttons
    // are in-place UI (React renders into the element's light DOM, so they
    // match the selector): closing on them opened the panel inside a drawer
    // already sliding away, clipped off the right edge. Only a real link out
    // of its panel closes the drawer, as any other link would. Tag copied from
    // mfe-registry.json — this script has no imports.
    const inChip = target.closest("mfe-cabinet-account-chip");
    const closer = inChip
      ? target.closest("a[href]")
      : target.closest('[data-slot="header-mobile-overlay"] :is(a, button)');
    if (closer?.closest('[data-slot="header-mobile-overlay"]')) setOpen(false);
  });

  window.addEventListener("keydown", e => {
    // Guard on the attribute so a zone's own Escape-driven UI (dialogs owning
    // their body scroll lock) is never clobbered by our overflow reset.
    if (e.key === "Escape" && header.hasAttribute("data-menu-open"))
      setOpen(false);
  });

  // ── Spanning ⇄ narrowing, second half ─────────────────────────
  // The decision and the starting offset are already done: the head
  // script (scripts/span-enter.ts) stamped `data-span-from` on <html>
  // before the first paint, and header-span.css painted the logo and
  // chip at the OTHER zone's position on frame one. All that is left is
  // to release them, and the transition interpolates off the committed
  // offset on the compositor.
  //
  // A transition needs the offset to have been RESOLVED as a style before
  // it is replaced. If both happen inside one style resolution the browser
  // has no start value and simply jumps.
  //
  // Measured on production: the conductor, where this script loads
  // `afterInteractive` and the offset was resolved long ago, interpolated
  // across 24 frames. The cabinet, where the proxy loads it `defer` in the
  // head and it can run before the first paint, produced two values — 270
  // and 0. Identical CSS, different load timing.
  //
  // So the resolution is forced rather than waited for. Reading offsetWidth
  // makes the browser flush styles and layout with the offset in place; the
  // attribute change after it is therefore a second resolution, and the
  // transition has both ends. One forced reflow on one element, once per
  // zone crossing — unlike the per-frame layout thrash this animation used
  // to do, which is what made it stutter in the first place.
  //
  // The rAF around it is still worth keeping: it gets off the parser's task
  // so the flush measures a document that has finished building.
  //
  // `data-span-run` is terminal. Intra-zone soft navigation never replays
  // it, and a reload never sets `data-span-from` in the first place (the
  // head script compares against the zone it recorded).
  const root = document.documentElement;
  if (root.hasAttribute("data-span-from"))
    requestAnimationFrame(() => {
      void root.offsetWidth;
      root.setAttribute("data-span-run", "");
    });
})();
