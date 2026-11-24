import { cache } from "react";
import type { Options } from "ky";
import { unwrap, type ApiEnvelope } from "@/shared/api";
import { apiClient } from "@/shared/api/server";
import type { User } from "../model/types";

const fetchMe = (options?: Options): Promise<User> =>
  apiClient.get("api/users/me", options).json<ApiEnvelope<User>>().then(unwrap);

/**
 * Cached per-request via React.cache so multiple server components in the
 * same request tree share a single network call.
 */
export const getMe = cache((): Promise<User> => fetchMe());

/**
 * One quick try (no retries, ~3s) for pages that render fine without the user:
 * an API outage then costs them a guest view, not a stalled page.
 */
export const getMeQuick = cache((): Promise<User> => fetchMe({ retry: 0, timeout: 3000 }));
