import ky from "ky";
import type { NextResponse } from "next/server";
import { API_BASE_URL } from "@/shared/config/api";
import { AUTH_COOKIES, COOKIE_OPTIONS, LOGIN_NONCE_TTL, TOKEN_TTL } from "@/shared/config/auth";
import type { ApiSchema } from "./contract";
import { unwrap, type ApiEnvelope } from "./envelope";

/**
 * Token helpers with no `next/headers` dependency, so they are usable from
 * the proxy (src/proxy.ts) as well as route handlers. Route handlers normally go through
 * `reissueTokens()` in auth-tokens.server.ts, which reads the cookie itself.
 */

export type AuthTokens = ApiSchema<"TokenResponse">;

/** Exchanges a refresh token for a fresh pair. Null when reissue fails. */
export async function reissueWithRefreshToken(
  refreshToken: string,
): Promise<AuthTokens | null> {
  try {
    return await ky
      .post(`${API_BASE_URL}/api/auth/reissue`, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      })
      .json<ApiEnvelope<AuthTokens>>()
      .then(unwrap);
  } catch {
    return null;
  }
}

export function setAuthCookies(response: NextResponse, tokens: AuthTokens) {
  response.cookies.set(AUTH_COOKIES.ACCESS_TOKEN, tokens.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: TOKEN_TTL.ACCESS_TOKEN,
  });
  response.cookies.set(AUTH_COOKIES.REFRESH_TOKEN, tokens.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: TOKEN_TTL.REFRESH_TOKEN,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIES.ACCESS_TOKEN);
  response.cookies.delete(AUTH_COOKIES.REFRESH_TOKEN);
}

/**
 * Login CSRF guard. Sign-in starts with a random nonce in an httpOnly cookie;
 * the API binds the one-time login code to it, and the callback must send the
 * same nonce to exchange the code — so a code minted in another browser (a
 * login link someone else opened) can't sign this one in.
 */
export function createLoginNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

export function setLoginNonceCookie(response: NextResponse, nonce: string) {
  response.cookies.set(AUTH_COOKIES.LOGIN_NONCE, nonce, {
    ...COOKIE_OPTIONS,
    maxAge: LOGIN_NONCE_TTL,
  });
}

export function clearLoginNonceCookie(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIES.LOGIN_NONCE);
}
