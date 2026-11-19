/**
 * Friendship read endpoints, relative to the Spring `/api` root. Shared by the
 * browser fetchers (via the BFF proxy) and the server fetchers (direct).
 */
export const FRIENDSHIP_ENDPOINTS = {
  friends: "friendships",
  sent: "friendships/sent",
  received: "friendships/received",
} as const;
