import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import ky from "ky";
import { AUTH_COOKIES } from "@/shared/config/auth";
import { API_BASE_URL } from "@/shared/config/api";
import { ROUTES } from "@/shared/config/routes";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
  const refreshToken = cookieStore.get(AUTH_COOKIES.REFRESH_TOKEN)?.value;

  // The access cookie lives only as long as the token (30 min); the refresh token lets the
  // server end the session even after that, instead of leaving it alive for two weeks.
  if (accessToken || refreshToken) {
    await ky
      .delete(`${API_BASE_URL}/api/auth/logout`, {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          ...(refreshToken && { "X-Refresh-Token": refreshToken }),
        },
      })
      .catch(() => {});
  }

  // 303: form POST 후 GET으로 전환 (기본 307은 /로 POST를 반복해 405 유발)
  const response = NextResponse.redirect(new URL(ROUTES.HOME, request.url), 303);
  response.cookies.delete(AUTH_COOKIES.ACCESS_TOKEN);
  response.cookies.delete(AUTH_COOKIES.REFRESH_TOKEN);
  return response;
}
