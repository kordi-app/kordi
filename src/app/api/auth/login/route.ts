import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/shared/config/api";
import { createLoginNonce, setLoginNonceCookie } from "@/shared/api/auth-tokens.server";

/** Starts Google sign-in with a login nonce (see createLoginNonce). */
export function GET() {
  const nonce = createLoginNonce();
  const url = new URL(`${API_BASE_URL}/oauth2/authorization/google`);
  url.searchParams.set("login_nonce", nonce);

  const response = NextResponse.redirect(url);
  setLoginNonceCookie(response, nonce);
  return response;
}
