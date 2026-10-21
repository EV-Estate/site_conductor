import { subscribeNewsletter } from "@/shared/api";

/** Why a subscribe attempt failed. The UI translates these; the entity must
 * not return prose, or the footer would answer a /ru/ reader in English. */
export type SubscribeError = "duplicate" | "server" | "network";

export type SubscribeResult =
  | { ok: true; id: string }
  | { ok: false; error: SubscribeError };

/** POST /api/v1/newsletter — subscribe an email via the generated client, so the
 * request goes to the configured API base URL (like `/contact`), not the site's origin. */
export async function subscribeToNewsletter(email: string): Promise<SubscribeResult> {
  try {
    const { data, response } = await subscribeNewsletter({ body: { email } });
    if (response?.status === 409) {
      return { ok: false, error: "duplicate" };
    }
    if (!data) {
      return { ok: false, error: "server" };
    }
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "network" };
  }
}
