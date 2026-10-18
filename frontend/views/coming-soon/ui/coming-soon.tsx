import type { Locale } from "@evinvest/i18n";
import { Logo } from "@evinvest/uikit";
import { translate } from "@/shared/config/i18n";
import { Headline } from "./headline";
import { TerrainHero } from "./terrain-hero";

const CONTAINER = "mx-auto w-full max-w-(--page-max) px-(--cs-gutter)";

/**
 * evinvest.ltd while the landing lives on its own host: the terrain, one line
 * of display copy. No site chrome — the page is the whole document.
 *
 * `fontClassName` carries the display face's CSS variable: the font is
 * declared by the route (app/), which is the only layer allowed to reach the
 * app shell's font files.
 */
export function ComingSoonView({
  locale,
  fontClassName,
}: {
  locale: Locale;
  fontClassName: string;
}) {
  const t = translate(locale);
  return (
    <div
      data-surface="coming-soon"
      className={`${fontClassName} flex min-h-svh flex-col`}
    >
      <TerrainHero
        containerClassName={CONTAINER}
        label={
          <>
            <span className="font-serif text-xl leading-none font-light italic">
              E[V]
            </span>
            <span className="font-sans text-(length:--cs-ev-note-size) leading-none tracking-(--cs-ev-note-tracking) text-ink-soft">
              {t("comingSoon.evNote", "expected value")}
            </span>
          </>
        }
      >
        <header className="flex h-(--cs-bar-h) shrink-0 items-start pt-(--cs-bar-pt) text-ink">
          <Logo className="cs-logo-full" />
          <Logo className="cs-logo-compact" />
          <span className="sr-only">Expected Value Investment</span>
        </header>
        <main className="grid grid-cols-(--cs-copy-cols) items-end gap-(--cs-copy-gap) pt-(--band-py)">
          <Headline
            first={
              <>
                <b className="font-medium">Expected</b> value,
              </>
            }
            second="arriving soon..."
          />
        </main>
      </TerrainHero>
    </div>
  );
}
