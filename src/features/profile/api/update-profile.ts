import { bffClient } from "@/shared/api";
import type { User } from "@/entities/user";

export function updateProfile(nickname: string): Promise<User> {
  return bffClient
    .patch("users/me/profile", { json: { nickname } })
    .json<User>();
}
