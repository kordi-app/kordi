import { NextRequest, NextResponse } from "next/server";
import ky from "ky";
import { API_BASE_URL } from "@/shared/config/api";
import { AUTH_COOKIES } from "@/shared/config/auth";
import { ROUTES } from "@/shared/config/routes";
import { unwrap, type ApiEnvelope } from "@/shared/api";
import { setAuthCookies, type AuthTokens } from "@/shared/api/auth-tokens.server";

/** Trade the one-time login code for tokens, server to server. */
async function exchange(code: string, nonce: string): Promise<AuthTokens | null> {
  try {
    return await ky
      .post(`${API_BASE_URL}/api/auth/exchange`, { json: { code, nonce } })
      .json<ApiEnvelope<AuthTokens>>()
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
  // set by /api/auth/login in this browser; a code from anyone else's sign-in won't match it
  const nonce = request.cookies.get(AUTH_COOKIES.LOGIN_NONCE)?.value;
  const tokens = code && nonce ? await exchange(code, nonce) : null;

  const response = NextResponse.redirect(
    new URL(tokens ? ROUTES.HOME : ROUTES.LOGIN, request.url),
  );
  response.cookies.delete(AUTH_COOKIES.LOGIN_NONCE);
  if (tokens) setAuthCookies(response, tokens);
  return response;
}
