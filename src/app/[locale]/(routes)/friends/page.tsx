import { localizedMetadata } from "@/shared/config/i18n/metadata";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { requireUser } from "@/entities/user/server";
import { friendshipQueries } from "@/entities/friendship";
import {
  getFriendsServer,
  getSentRequestsServer,
  getReceivedRequestsServer,
} from "@/entities/friendship/server";
import { FriendsPage } from "@/views/friends";

export const generateMetadata = localizedMetadata("friends");

export default async function Page() {
  const queryClient = new QueryClient();

  // Prefetch with server fetchers so the panel's useSuspenseQuery hydrates
  // instead of fetching during SSR (browser proxy URLs don't resolve there)
  const [user] = await Promise.all([
    requireUser(queryClient),
    queryClient.prefetchQuery({
      ...friendshipQueries.friends(),
      queryFn: getFriendsServer,
    }),
    queryClient.prefetchQuery({
      ...friendshipQueries.sent(),
      queryFn: getSentRequestsServer,
    }),
    queryClient.prefetchQuery({
      ...friendshipQueries.received(),
      queryFn: getReceivedRequestsServer,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FriendsPage user={user} />
    </HydrationBoundary>
  );
}
