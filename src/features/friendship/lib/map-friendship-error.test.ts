import { HTTPError, type KyRequest, type NormalizedOptions } from "ky";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@/shared/api";
import { mapFriendshipError } from "./map-friendship-error";

function httpError(status: number, body: unknown): HTTPError {
  const response = new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const request = new Request("http://localhost/api/backend/friendships") as KyRequest;
  return new HTTPError(response, request, {} as NormalizedOptions);
}

describe("mapFriendshipError", () => {
  it("maps a known server code to its message key", async () => {
    const error = httpError(409, { code: ERROR_CODES.FRIENDSHIP_ALREADY_EXISTS, message: "", path: "" });
    expect(await mapFriendshipError(error)).toBe("friends.error.alreadyExists");
  });

  it("falls back for codes it does not map, bodies without a code and non-HTTP errors", async () => {
    expect(await mapFriendshipError(httpError(409, { code: ERROR_CODES.DATA_CONFLICT }))).toBe("friends.error.invalid");
    expect(await mapFriendshipError(httpError(401, {}))).toBe("friends.error.invalid");
    expect(await mapFriendshipError(new Error("offline"))).toBe("friends.error.invalid");
  });
});
