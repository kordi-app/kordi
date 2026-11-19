import { cache } from "react";
import { unwrap, type ApiEnvelope } from "@/shared/api";
import { apiClient } from "@/shared/api/server";
import type { User } from "../model/types";

/**
 * Cached per-request via React.cache so multiple server components in the
 * same request tree share a single network call.
 */
export const getMe = cache(
  (): Promise<User> =>
    apiClient.get("api/users/me").json<ApiEnvelope<User>>().then(unwrap),
);
