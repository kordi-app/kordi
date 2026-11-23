import { NextRequest, NextResponse } from "next/server";
import ky from "ky";
import { API_BASE_URL } from "@/shared/config/api";
import { AUTH_COOKIES, COOKIE_OPTIONS, TOKEN_TTL } from "@/shared/config/auth";
import { ROUTES } from "@/shared/config/routes";
import { unwrap, type ApiEnvelope } from "@/shared/api";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** Trade the one-time login code for tokens, server to server. */
async function exchange(code: string): Promise<Tokens | null> {
  try {
    return await ky
      .post(`${API_BASE_URL}/api/auth/exchange`, { json: { code } })
      .json<ApiEnvelope<Tokens>>()
      .then(unwrap);
  } catch {
    return null;
  }
}

/**
 * Where the API sends the browser after Google sign-in. The URL carries only a
 * short-lived one-time code (tokens in a URL end up in history and logs);
 * it's exchanged here and the tokens go straight into httpOnly cookies.
 *
 * Tokens are never accepted from the query string: a link carrying someone
 * else's tokens would sign the visitor into that account (login CSRF), and
 * tokens in URLs leak into history and logs.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokens = code ? await exchange(code) : null;

  if (!tokens) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
  }

  const response = NextResponse.redirect(new URL(ROUTES.HOME, request.url));
  response.cookies.set(AUTH_COOKIES.ACCESS_TOKEN, tokens.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: TOKEN_TTL.ACCESS_TOKEN,
  });
  response.cookies.set(AUTH_COOKIES.REFRESH_TOKEN, tokens.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: TOKEN_TTL.REFRESH_TOKEN,
  });
  return response;
}
