import { unwrap, type ApiEnvelope } from "@/shared/api";
import { apiClient } from "@/shared/api/server";
import type { Friendship } from "../model/types";
import { FRIENDSHIP_ENDPOINTS } from "./endpoints";

/**
 * Server-side variants: hit the Spring API directly (cookie → Bearer via
 * apiClient), since the relative /api/backend URLs cannot be resolved during SSR.
 */
const get = (path: string) =>
  apiClient
    .get(`api/${path}`)
    .json<ApiEnvelope<Friendship[]>>()
    .then(unwrap);

export const getFriendsServer = () => get(FRIENDSHIP_ENDPOINTS.friends);
export const getSentRequestsServer = () => get(FRIENDSHIP_ENDPOINTS.sent);
export const getReceivedRequestsServer = () => get(FRIENDSHIP_ENDPOINTS.received);
