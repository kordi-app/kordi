// Client-safe exports. The server client (apiClient) reads next/headers,
// so import it from "@/shared/api/server" in server code only.
export { bffClient } from "./bff-client";
export { publicApiClient } from "./public-client";
export { unwrap, type ApiEnvelope, type ApiErrorBody } from "./envelope";
