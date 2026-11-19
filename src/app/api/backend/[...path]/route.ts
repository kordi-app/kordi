import { NextRequest, NextResponse } from "next/server";
import { HTTPError } from "ky";
import { apiClient } from "@/shared/api/server";
import type { ApiEnvelope } from "@/shared/api";
import { errorResponse } from "@/shared/api/proxy";
import {
  reissueTokens,
  setAuthCookies,
} from "@/shared/api/auth-tokens.server";

/**
 * Catch-all BFF proxy: /api/backend/* → Spring API.
 * - apiClient translates the httpOnly auth cookie into a Bearer header.
 * - The Spring ApiResponse envelope ({ data }) is unwrapped so browsers
 *   receive the bare payload (null for void endpoints).
 * - On 401 the refresh token is exchanged for a new pair, the call is
 *   retried once, and the new cookies ride back on the response.
 * Auth routes (cookie writes/redirects) stay as dedicated handlers under
 * /api/auth.
 */

type Method = "get" | "post" | "patch" | "delete";
type Props = { params: Promise<{ path: string[] }> };

async function handle(
  request: NextRequest,
  params: Props["params"],
  method: Method,
): Promise<NextResponse> {
  const { path } = await params;
  const url = `api/${path.join("/")}${request.nextUrl.search}`;
  const body =
    method === "get"
      ? undefined
      : await request.json().catch(() => undefined);

  const call = async (authorization?: string) => {
    const res = await apiClient(url, {
      method,
      ...(body !== undefined && { json: body }),
      ...(authorization && { headers: { Authorization: authorization } }),
    }).json<Partial<ApiEnvelope<unknown>>>();
    return res.data ?? null;
  };

  try {
    return NextResponse.json(await call());
  } catch (err) {
    if (!(err instanceof HTTPError) || err.response.status !== 401) {
      return errorResponse(err);
    }

    const tokens = await reissueTokens();
    if (!tokens) return errorResponse(err);

    try {
      const result = await call(`Bearer ${tokens.accessToken}`);
      const response = NextResponse.json(result);
      setAuthCookies(response, tokens);
      return response;
    } catch (retryErr) {
      // Keep the fresh tokens even when the retried call fails for other reasons
      const response = await errorResponse(retryErr);
      setAuthCookies(response, tokens);
      return response;
    }
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  return handle(request, params, "get");
}

export async function POST(request: NextRequest, { params }: Props) {
  return handle(request, params, "post");
}

export async function PATCH(request: NextRequest, { params }: Props) {
  return handle(request, params, "patch");
}

export async function DELETE(request: NextRequest, { params }: Props) {
  return handle(request, params, "delete");
}
