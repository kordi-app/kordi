"use client";

import { useState } from "react";
import { HTTPError } from "ky";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isPublicPath } from "@/shared/config/auth";
import { routing } from "@/shared/config/i18n/routing";
import { ROUTES } from "@/shared/config/routes";
import { withNextParam } from "@/shared/lib/safe-next-path";

let redirecting = false;

/**
 * A 401 that reaches the browser means the session is really gone (the BFF proxy
 * already tried to reissue): send the visitor to sign in, and back here afterwards.
 * Guests on public pages stay put — a 401 there is just a members-only extra.
 */
function handleUnauthorized(error: unknown) {
  if (redirecting || typeof window === "undefined") return;
  if (!(error instanceof HTTPError) || error.response.status !== 401) return;
  const { pathname, search } = window.location;
  const [, first] = pathname.split("/");
  const locale = (routing.locales as readonly string[]).includes(first) ? first : routing.defaultLocale;
  const withoutLocale = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";
  if (isPublicPath(withoutLocale)) return;
  redirecting = true;
  const login = withNextParam(`/${locale}${ROUTES.LOGIN}`, `${pathname}${search}`);
  window.location.assign(`${login}${login.includes("?") ? "&" : "?"}error=session_expired`);
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleUnauthorized }),
        mutationCache: new MutationCache({ onError: handleUnauthorized }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            // a 401 won't fix itself by retrying
            retry: (failureCount, error) =>
              !(error instanceof HTTPError && error.response.status === 401) && failureCount < 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
