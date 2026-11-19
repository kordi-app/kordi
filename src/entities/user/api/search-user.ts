import { bffClient } from "@/shared/api";
import type { PublicUser } from "../model/types";

export function searchUserByNickname(nickname: string): Promise<PublicUser> {
  return bffClient
    .get("users/search", { searchParams: { nickname } })
    .json<PublicUser>();
}
