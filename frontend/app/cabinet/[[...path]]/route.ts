import { config } from "@/config";
import { proxyZone } from "@/shared/zone-proxy";

// Never prerender the proxy: a build-time GET would bake a 404/502.
export const dynamic = "force-dynamic";

// `noindex`: the cabinet's own HTML (its login screen included) carries no
// `meta robots` of its own — see the comment on the flag in zone-proxy.ts.
// `shell: false`: the cabinet serves itself. The conductor header it used to get
// here was the old landing's (moved to invest.evinvest.ltd), and its links now
// 404; the wallet popups need no header at all. The cabinet sizes against
// `--ev-shell-offset` with a `0px` fallback, so nothing depends on the shell.
export const GET = (request: Request) =>
  proxyZone(request, config.cabinetZoneUrl, {
    shell: false,
    noindex: true,
  });
export const HEAD = GET;
export const POST = GET;
