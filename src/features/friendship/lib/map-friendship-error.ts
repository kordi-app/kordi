import { HTTPError } from "ky";
import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from "@/shared/api";

/**
 * Server CoreExceptionCode → i18n key. Keyed by the generated ERROR_CODES, so a
 * code renamed or removed on the server breaks this map at compile time.
 */
const CODE_TO_KEY: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.CANNOT_ADD_SELF]: "friends.error.cannotAddSelf",
  [ERROR_CODES.FRIENDSHIP_ALREADY_EXISTS]: "friends.error.alreadyExists",
  [ERROR_CODES.FRIENDSHIP_NOT_FOUND]: "friends.error.notFound",
  [ERROR_CODES.FRIENDSHIP_NOT_PENDING]: "friends.error.notPending",
  [ERROR_CODES.USER_NOT_FOUND]: "friends.error.userNotFound",
  [ERROR_CODES.INVALID_REQUEST]: "friends.error.invalid",
};

export async function mapFriendshipError(err: unknown): Promise<string> {
  if (!(err instanceof HTTPError)) return "friends.error.invalid";
  try {
    const body = (await err.response.clone().json()) as ApiErrorBody;
    const key = body.code ? CODE_TO_KEY[body.code] : undefined;
    if (key) return key;
  } catch {
    // fallthrough
  }
  return "friends.error.invalid";
}
