import { bffClient } from "@/shared/api";
import type { Friendship } from "../model/types";
import { FRIENDSHIP_ENDPOINTS } from "./endpoints";

const get = (path: string) => bffClient.get(path).json<Friendship[]>();

export const getFriends = () => get(FRIENDSHIP_ENDPOINTS.friends);
export const getSentRequests = () => get(FRIENDSHIP_ENDPOINTS.sent);
export const getReceivedRequests = () => get(FRIENDSHIP_ENDPOINTS.received);
