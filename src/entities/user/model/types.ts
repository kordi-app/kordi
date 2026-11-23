import type { ApiSchema } from "@/shared/api";

/** The signed-in user's own profile (includes private fields). GET /api/users/me */
export type User = ApiSchema<"UserResponse">;

/** Another user's public profile, as returned by user search. */
export type PublicUser = ApiSchema<"UserSearchResponse">;
