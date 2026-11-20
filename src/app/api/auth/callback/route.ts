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
 * Servers from before the code exchange put the tokens in the query instead;
 * that's still accepted until the API is updated everywhere.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokens: Tokens | null = code
    ? await exchange(code)
    : params.get("accessToken") && params.get("refreshToken")
      ? { accessToken: params.get("accessToken")!, refreshToken: params.get("refreshToken")! }
      : null;

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
