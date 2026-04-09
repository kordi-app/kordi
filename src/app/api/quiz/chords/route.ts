import { type NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/shared/api";

export async function GET(request: NextRequest) {
  const difficulty = request.nextUrl.searchParams.get("difficulty");
  const result = await apiClient
    .get("api/quiz/chords", { searchParams: { difficulty: difficulty ?? "" } })
    .json();
  return NextResponse.json(result);
}
