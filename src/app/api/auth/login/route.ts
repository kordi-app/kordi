import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL } from "@/shared/config/api";
import {
  createLoginNonce,
  setLoginNextCookie,
  setLoginNonceCookie,
} from "@/shared/api/auth-tokens.server";
import { safeNextPath } from "@/shared/lib/safe-next-path";

/**
 * Starts Google sign-in with a login nonce (see createLoginNonce). `?next=` (a same-site
 * path) is kept beside the nonce so the callback can bring the visitor back there.
 */
export function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const nonce = createLoginNonce();
  const url = new URL(`${API_BASE_URL}/oauth2/authorization/google`);
  url.searchParams.set("login_nonce", nonce);

  const response = NextResponse.redirect(url);
  setLoginNonceCookie(response, nonce);
  if (next) setLoginNextCookie(response, next);
  return response;
}
