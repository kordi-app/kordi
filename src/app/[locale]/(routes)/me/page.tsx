import { localizedMetadata } from "@/shared/config/i18n/metadata";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { requireUser } from "@/entities/user/server";
import { getMyScores } from "@/entities/chord-quiz/server";
import type { ScoreRecord } from "@/entities/chord-quiz";
import { MePage } from "@/views/me";

export const generateMetadata = localizedMetadata("me");

export default async function Page() {
  const queryClient = new QueryClient();

  // Parallel fetch: auth guard + scores in flight together
  const [user, scores] = await Promise.all([
    requireUser(queryClient),
    getMyScores().catch(() => [] as ScoreRecord[]),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MePage user={user} scores={scores} />
    </HydrationBoundary>
  );
}
