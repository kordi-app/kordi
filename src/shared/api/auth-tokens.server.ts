import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/shared/config/auth";
import { reissueWithRefreshToken, type AuthTokens } from "./auth-tokens";

export {
  setAuthCookies,
  clearAuthCookies,
  createLoginNonce,
  setLoginNonceCookie,
  clearLoginNonceCookie,
  type AuthTokens,
} from "./auth-tokens";

/**
 * Exchanges the refresh-token cookie of the current request for a fresh
 * token pair. Returns null when there is no refresh token or reissue fails.
 */
export async function reissueTokens(): Promise<AuthTokens | null> {
  const refreshToken = (await cookies()).get(AUTH_COOKIES.REFRESH_TOKEN)?.value;
  if (!refreshToken) return null;
  return reissueWithRefreshToken(refreshToken);
}
