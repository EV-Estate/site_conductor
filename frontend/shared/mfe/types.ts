// The microfrontend registry contract. Client-safe (no server imports) so both
// the registry reader and client components can share these types.

export type MfeKind = "component" | "page";

export interface MfeEntry {
  /** Logical name, e.g. "calculator.yield". A `kind: "page"` entry is mounted by
   *  the route that looks it up by name (`real-estate.data` → `/data`). */
  name: string;
  /** Globally-unique, versioned custom-element tag, e.g. "mfe-calculator-yield". */
  tag: string;
  /** URL of the remote's self-registering ESM bundle (its own origin/CDN). */
  scriptUrl: string;
  /** Whether the remote is an inline widget or owns a whole route. */
  kind: MfeKind;
}
