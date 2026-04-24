// Client-safe exports only. For server-only APIs (getMe, userServerQueries),
// import from "@/entities/user/server" instead.
export type { User } from "./model/types";
export { userQueries } from "./api/queries";
