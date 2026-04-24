import { cache } from "react";
import { apiClient } from "@/shared/api";
import type { User } from "../model/types";

/**
 * Cached per-request via React.cache so multiple server components in the
 * same request tree share a single network call.
 */
export const getMe = cache(async (): Promise<User> => {
  return apiClient.get("api/users/me").json<User>();
});
