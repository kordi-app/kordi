import { ROUTES } from "./routes";

export const AUTH_COOKIES = {
  ACCESS_TOKEN: "kordi_at",
  REFRESH_TOKEN: "kordi_rt",
  /** binds the one-time login code to the browser that started sign-in */
  LOGIN_NONCE: "kordi_ln",
  /** where to land after sign-in (a same-site path, checked again before use) */
  LOGIN_NEXT: "kordi_ln_next",
} as const;

/** long enough to get through Google's consent screen (seconds) */
export const LOGIN_NONCE_TTL = 10 * 60;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Cookie lifetimes (seconds). The access token itself lives 30 minutes on the
 * server; its cookie is dropped a minute earlier, so the proxy (which
 * refreshes when the cookie is gone) renews it *before* the server would reject
 * it — otherwise a page opened in the last seconds sends an expired token and
 * lands on the login page despite a valid refresh token.
 */
export const TOKEN_TTL = {
  ACCESS_TOKEN: 29 * 60, // token: 30 min — see above
  REFRESH_TOKEN: 14 * 24 * 60 * 60, // 14 days (seconds)
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.LOGIN,
  ROUTES.PIANO,
  ROUTES.SCORE,
  // practice runs entirely in the browser (no API calls); guests can try it
  ROUTES.CHORD_PRACTICE,
] as const;

/** Whether a path (without the locale prefix) is open to guests. */
export function isPublicPath(pathnameWithoutLocale: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(route + "/"),
  );
}
