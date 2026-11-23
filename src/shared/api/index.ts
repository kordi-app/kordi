// Client-safe exports. The server client (apiClient) reads next/headers,
// so import it from "@/shared/api/server" in server code only.
export { bffClient } from "./bff-client";
export { publicApiClient } from "./public-client";
export { unwrap, type ApiEnvelope, type ApiErrorBody } from "./envelope";
export type { ApiSchema, ApiSchemas, AssertTrue, FitsContract } from "./contract";
export {
  ERROR_CODES,
  ERROR_CODE_STATUS,
  type ErrorCode,
  type ErrorCodeName,
} from "./generated/error-codes";
