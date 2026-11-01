// A light-DOM element remote (e.g. the analytics overview tile) styles itself by
// injecting its own Tailwind stylesheet into the host <head>. That sheet's `@layer
// utilities` merges with the host's and, loading last, wins — its non-responsive
// `.grid-cols-1` overrode our `lg:grid-cols-3` and collapsed grids to one column.
// We move every stylesheet the remote injects into the low-priority `reamfe`
// layer (declared first in application/styles/globals.css, below all host layers)
// so host styles always win while the remote stays fully styled.
//
// Keyed on the entry's own stem (`/mfe/analytics/overview.js` → sheets under
// `/mfe/analytics/overview.`), not on origin or directory: the remote is served
// from this host's origin, and a page remote shares the directory
// (`dashboard.css`), whose sheet must never be demoted.
//
// Only `<link>`s are demoted: a remote that ships a filled `<style>` already
// wrapped in `@layer reamfe` has nothing to demote.
export function containRemoteStyles(scriptUrl: string): () => void {
  if (typeof document === "undefined") return () => {};
  const entry = new URL(scriptUrl, window.location.href).href;
  if (!entry.endsWith(".js")) throw new Error(`remote entry ${entry} is not a .js module`);
  const stem = entry.slice(0, -"js".length);

  const demote = (link: HTMLLinkElement) => {
    const style = document.createElement("style");
    style.dataset.reamfe = "";
    style.textContent = `@import url(${JSON.stringify(link.href)}) layer(reamfe);`;
    link.replaceWith(style);
  };

  const scan = () => {
    document.head
      .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
      .forEach((link) => {
        if (link.href.startsWith(stem)) demote(link);
      });
  };

  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.head, { childList: true });
  return () => observer.disconnect();
}
