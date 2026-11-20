import { ROUTES } from "./routes";

export const AUTH_COOKIES = {
  ACCESS_TOKEN: "kordi_at",
  REFRESH_TOKEN: "kordi_rt",
} as const;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Cookie lifetimes (seconds). The access token itself lives 30 minutes on the
 * server; its cookie is dropped a minute earlier, so the middleware (which
 * refreshes when the cookie is gone) renews it *before* the server would reject
 * it — otherwise a page opened in the last seconds sends an expired token and
 * lands on the login page despite a valid refresh token.
 */
export const TOKEN_TTL = {
  ACCESS_TOKEN: 29 * 60, // token: 30 min — see above
  REFRESH_TOKEN: 14 * 24 * 60 * 60, // 14 days (seconds)
} as const;

export const PUBLIC_ROUTES = [ROUTES.HOME, ROUTES.LOGIN, ROUTES.PIANO] as const;
