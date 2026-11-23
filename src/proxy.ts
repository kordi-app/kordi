import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/shared/config/i18n/routing";
import { AUTH_COOKIES, PUBLIC_ROUTES } from "@/shared/config/auth";
import { ROUTES } from "@/shared/config/routes";
import {
  clearAuthCookies,
  reissueWithRefreshToken,
  setAuthCookies,
} from "@/shared/api/auth-tokens";

const intlMiddleware = createIntlMiddleware(routing);

const localePattern = new RegExp(
  `^/(${routing.locales.join("|")})(/|$)`,
);

function stripLocale(pathname: string): string {
  return pathname.replace(localePattern, "/").replace(/\/+$/, "") || "/";
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = intlMiddleware(request);

  const pathnameWithoutLocale = stripLocale(pathname);
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) =>
      pathnameWithoutLocale === route ||
      pathnameWithoutLocale.startsWith(route + "/"),
  );

  const accessToken = request.cookies.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(AUTH_COOKIES.REFRESH_TOKEN)?.value;

  if (isPublicRoute) {
    // Public pages still render differently for members (home: name, look,
    // ranked course times), so an expired access token is renewed here too —
    // otherwise a member coming back after 30 minutes is treated as a guest.
    // A failed renewal just leaves them a guest; no login redirect.
    if (!accessToken && refreshToken) {
      const tokens = await reissueWithRefreshToken(refreshToken);
      if (!tokens) {
        clearAuthCookies(response);
        return response;
      }
      const retry = NextResponse.redirect(request.url);
      setAuthCookies(retry, tokens);
      return retry;
    }
    return response;
  }

  // keep the visitor's language on the way to the login page
  const locale = pathname.match(localePattern)?.[1] ?? routing.defaultLocale;
  const loginUrl = new URL(`/${locale}${ROUTES.LOGIN}`, request.url);

  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(loginUrl);
  }

  if (!accessToken && refreshToken) {
    // 자기 자신의 /api/auth/reissue를 HTTP로 다시 부르지 않고 Spring에 직접 재발급 요청
    const tokens = await reissueWithRefreshToken(refreshToken);
    if (!tokens) {
      const toLogin = NextResponse.redirect(loginUrl);
      clearAuthCookies(toLogin);
      return toLogin;
    }

    // 같은 URL로 재진입: 새 쿠키를 심은 뒤 요청을 다시 태워야
    // 이번 렌더(RSC)도 새 액세스 토큰으로 백엔드를 호출할 수 있다
    const retry = NextResponse.redirect(request.url);
    setAuthCookies(retry, tokens);
    return retry;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
