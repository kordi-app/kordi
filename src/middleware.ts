import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/shared/config/i18n/routing";
import { AUTH_COOKIES, PUBLIC_ROUTES } from "@/shared/config/auth";
import { ROUTES } from "@/shared/config/routes";

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
    try {
      const reissueRes = await fetch(
        new URL("/api/auth/reissue", request.url),
        {
          method: "POST",
          headers: { Cookie: request.headers.get("cookie") ?? "" },
        },
      );

      if (!reissueRes.ok) {
        return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
      }

      const setCookieHeaders = reissueRes.headers.getSetCookie();
      for (const cookie of setCookieHeaders) {
        response.headers.append("Set-Cookie", cookie);
      }
    } catch {
      return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
