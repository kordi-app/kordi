import { NextResponse } from "next/server";
import {
  clearAuthCookies,
  reissueTokens,
  setAuthCookies,
} from "@/shared/api/auth-tokens.server";

export async function POST() {
  const tokens = await reissueTokens();

  if (!tokens) {
    const response = NextResponse.json(
      { error: "Refresh failed" },
      { status: 401 },
    );
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({ success: true });
  setAuthCookies(response, tokens);
  return response;
}
