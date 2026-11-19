import { publicApiClient, unwrap, type ApiEnvelope } from "@/shared/api";

export function checkNickname(nickname: string): Promise<boolean> {
  return publicApiClient
    .get("users/check-nickname", { searchParams: { nickname } })
    .json<ApiEnvelope<boolean>>()
    .then(unwrap);
}
