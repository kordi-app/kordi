import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { userServerQueries } from "@/entities/user/server";
import { getMyScores } from "@/entities/quiz/server";
import type { ScoreRecord } from "@/entities/quiz";
import { MePage } from "@/views/me";
import { ROUTES } from "@/shared/config/routes";

export const metadata: Metadata = {
  title: "My Profile | Kordi",
};

export default async function Page() {
  const queryClient = new QueryClient();

  // Parallel fetch: auth check + scores in flight together.
  // Scores has .catch() so it never rejects; auth does reject on 401.
  const [authResult, scores] = await Promise.allSettled([
    queryClient.fetchQuery(userServerQueries.me()),
    getMyScores().catch(() => [] as ScoreRecord[]),
  ]);

  if (authResult.status === "rejected") {
    redirect(ROUTES.LOGIN);
  }

  const user = queryClient.getQueryData(userServerQueries.me().queryKey);
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const scoreList = scores.status === "fulfilled" ? scores.value : [];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MePage user={user} scores={scoreList} />
    </HydrationBoundary>
  );
}
