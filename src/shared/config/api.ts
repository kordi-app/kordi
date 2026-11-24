export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Realtime endpoint for the home-page piano world (Spring WebSocket). */
export const WORLD_SOCKET_URL =
  process.env.NEXT_PUBLIC_WORLD_SOCKET_URL ??
  `${API_BASE_URL.replace(/^http/, "ws")}/ws/world`;

/** The production API's domain: a development build pointed at it reads and writes real data. */
const PRODUCTION_DOMAIN = "kordi.online";

/** Whether this URL is the production API (or a subdomain of it). */
export function isProductionUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === PRODUCTION_DOMAIN || host.endsWith(`.${PRODUCTION_DOMAIN}`);
  } catch {
    return false;
  }
}

// Say so loudly, once, when development talks to production (see .env.example)
if (process.env.NODE_ENV === "development" && (isProductionUrl(API_BASE_URL) || isProductionUrl(WORLD_SOCKET_URL))) {
  console.warn(
    `[kordi] This development build talks to the PRODUCTION API (${API_BASE_URL}): what you do here ` +
      "changes real data. Point NEXT_PUBLIC_API_URL at your local server (see .env.example) unless you mean to.",
  );
}
