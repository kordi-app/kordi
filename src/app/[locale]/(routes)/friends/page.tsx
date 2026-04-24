import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QueryClient } from "@tanstack/react-query";
import { userServerQueries } from "@/entities/user/server";
import { FriendsPage } from "@/views/friends";
import { ROUTES } from "@/shared/config/routes";

export const metadata: Metadata = {
  title: "Friends | Kordi",
};

export default async function Page() {
  const queryClient = new QueryClient();

  try {
    await queryClient.fetchQuery(userServerQueries.me());
  } catch {
    redirect(ROUTES.LOGIN);
  }

  const user = queryClient.getQueryData(userServerQueries.me().queryKey);

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  return <FriendsPage user={user} />;
}
