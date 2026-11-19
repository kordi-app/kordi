import ky from "ky";
import type { NextResponse } from "next/server";
import { API_BASE_URL } from "@/shared/config/api";
import { AUTH_COOKIES, COOKIE_OPTIONS, TOKEN_TTL } from "@/shared/config/auth";
import { unwrap, type ApiEnvelope } from "./envelope";

/**
 * Token helpers with no `next/headers` dependency, so they are usable from
 * middleware as well as route handlers. Route handlers normally go through
 * `reissueTokens()` in auth-tokens.server.ts, which reads the cookie itself.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

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
