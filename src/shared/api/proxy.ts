import { NextResponse } from "next/server";
import { HTTPError } from "ky";

/** Converts a backend call failure into a status-preserving JSON response. */
export async function errorResponse(err: unknown): Promise<NextResponse> {
  if (err instanceof HTTPError) {
    const status = err.response.status;
    try {
      const body = await err.response.json();
      return NextResponse.json(body, { status });
    } catch {
      return NextResponse.json({ message: err.message }, { status });
    }
  }
  return NextResponse.json({ message: "Internal error" }, { status: 500 });
}
