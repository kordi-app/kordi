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

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = intlMiddleware(request);

  const pathnameWithoutLocale = stripLocale(pathname);
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) =>
      pathnameWithoutLocale === route ||
      pathnameWithoutLocale.startsWith(route + "/"),
  );

  if (isPublicRoute) return response;

  const accessToken = request.cookies.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(AUTH_COOKIES.REFRESH_TOKEN)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
  }

  if (!accessToken && refreshToken) {
    // 자기 자신의 /api/auth/reissue를 HTTP로 다시 부르지 않고 Spring에 직접 재발급 요청
    const tokens = await reissueWithRefreshToken(refreshToken);
    if (!tokens) {
      const toLogin = NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
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
