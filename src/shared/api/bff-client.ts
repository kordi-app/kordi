import ky from "ky";

/**
 * Browser API client. Calls go through the Next.js BFF proxy
 * (app/api/backend/[...path]), which attaches the httpOnly auth cookie,
 * transparently reissues tokens on 401 and unwraps the Spring envelope —
 * so responses here are already the bare payload.
 *
 * Paths are relative to the Spring `/api` root, without a leading slash:
 *   bffClient.get("friendships/sent")
 */
export const bffClient = ky.create({ prefixUrl: "/api/backend" });
