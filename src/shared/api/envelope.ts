import type { ApiSchema } from "./contract";

/**
 * Spring ApiResponse envelope. Success payloads always arrive under `data`
 * (objects, lists and scalars alike); errors carry `code`/`message`/`path`.
 */
export interface ApiEnvelope<T> {
  data: T;
}

/**
 * Failure body (spec: ApiErrorResponse). Partial because a non-API failure
 * (proxy, gateway, Spring Security's bare 401) may carry no envelope at all.
 */
export type ApiErrorBody = Partial<ApiSchema<"ApiErrorResponse">>;

export function unwrap<T>(res: ApiEnvelope<T>): T {
  return res.data;
}
