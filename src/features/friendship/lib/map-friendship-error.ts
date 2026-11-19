import { HTTPError } from "ky";
import type { ApiErrorBody } from "@/shared/api";

/** Spring CoreExceptionCode.code → i18n key */
const CODE_TO_KEY: Record<number, string> = {
  4001: "friends.error.cannotAddSelf",
  4002: "friends.error.alreadyExists",
  4003: "friends.error.notFound",
  3001: "friends.error.userNotFound",
  1003: "friends.error.invalid",
};

export async function mapFriendshipError(err: unknown): Promise<string> {
  if (!(err instanceof HTTPError)) return "friends.error.invalid";
  try {
    const body = (await err.response.clone().json()) as ApiErrorBody;
    if (body.code && CODE_TO_KEY[body.code]) return CODE_TO_KEY[body.code];
  } catch {
    // fallthrough
  }
  return "friends.error.invalid";
}
