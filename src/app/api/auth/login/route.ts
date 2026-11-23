import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/shared/config/api";
import { AUTH_COOKIES, COOKIE_OPTIONS, LOGIN_NONCE_TTL } from "@/shared/config/auth";

/**
 * Starts Google sign-in. A random nonce goes into an httpOnly cookie here and
 * along to the API, which binds the one-time login code to it. The callback
 * sends the cookie's nonce with the code, so a code minted in someone else's
 * browser (a login-CSRF link) cannot be exchanged in this one.
 */
export function GET() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = Buffer.from(bytes).toString("base64url");

  const url = new URL(`${API_BASE_URL}/oauth2/authorization/google`);
  url.searchParams.set("login_nonce", nonce);

  const response = NextResponse.redirect(url);
  response.cookies.set(AUTH_COOKIES.LOGIN_NONCE, nonce, {
    ...COOKIE_OPTIONS,
    maxAge: LOGIN_NONCE_TTL,
  });
  return response;
}
