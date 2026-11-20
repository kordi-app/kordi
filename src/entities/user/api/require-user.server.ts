import { HTTPError } from "ky";
import { getLocale } from "next-intl/server";
import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import type { User } from "../model/types";
import { userServerQueries } from "./queries.server";

/**
 * Auth guard for server components. Fetches the current user into the
 * query client (so pages can dehydrate it) and sends the visitor to the
 * login page (in their language) when the API says they aren't signed in.
 * Other failures (the API being down) surface as errors instead of looking
 * like a sign-out.
 */
export async function requireUser(queryClient: QueryClient): Promise<User> {
  try {
    return await queryClient.fetchQuery(userServerQueries.me());
  } catch (error) {
    if (error instanceof HTTPError && (error.response.status === 401 || error.response.status === 403)) {
      return redirect({ href: ROUTES.LOGIN, locale: await getLocale() });
    }
    throw error;
  }
}
