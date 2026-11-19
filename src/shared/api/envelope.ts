/**
 * Spring ApiResponse envelope. Success payloads arrive under `data`
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

/**
 * Extracts the payload. Also accepts the legacy server shape (before server
 * e42f6ae), which flattened object payloads instead of nesting them under
 * `data` — so this client works against either server version during rollout.
 * TODO: drop the fallback once the new server is deployed everywhere.
 */
export function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res !== null && typeof res === "object" && "data" in res) {
    return res.data;
  }
  return res as unknown as T;
}
