/**
 * Spring ApiResponse envelope. Success payloads always arrive under `data`
 * (objects, lists and scalars alike); errors carry `code`/`message`/`path`.
 */
export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorBody {
  code?: number;
  message?: string;
  path?: string;
}

export function unwrap<T>(res: ApiEnvelope<T>): T {
  return res.data;
}
