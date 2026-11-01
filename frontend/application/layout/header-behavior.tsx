"use client";

import { useEffect } from "react";

// The header's whole runtime: toggles `data-scrolled` / `data-menu-open` on the
// header root, which the server-rendered markup styles off through
// `group-data-[...]/header:` variants. Kept as a null-rendering leaf rather than
// state in the header, so the bar, the drawer and their links stay Server
// Component markup and only this effect ships to the browser.
export function HeaderBehavior() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(
      'header[data-slot="header"]'
    );
    if (!header) return;

    const onScroll = () =>
      window.scrollY > 50
        ? header.setAttribute("data-scrolled", "")
        : header.removeAttribute("data-scrolled");

    // The drawer stays mounted and is hidden with `visibility`, which already
    // takes it out of the tab order and the accessibility tree — so open/close
    // needs no `inert` or `aria-hidden` bookkeeping. What CSS cannot do is move
    // focus: into the drawer on open, back to the trigger on close, or a
    // keyboard user is left focused on a button behind a scrim.
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

    // Delegated, so the drawer's links and the CTA need no wiring of their own:
    // any link or button inside the open overlay dismisses it.
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const toggle = e.target.closest("[data-menu-toggle]");
      if (toggle)
        return setOpen(toggle.getAttribute("data-menu-toggle") === "open");
      if (e.target.closest('[data-slot="header-mobile-overlay"] :is(a, button)'))
        setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && header.hasAttribute("data-menu-open"))
        setOpen(false);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    header.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      header.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
