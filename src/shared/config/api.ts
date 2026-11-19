export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Realtime endpoint for the home-page piano world (Spring WebSocket). */
export const WORLD_SOCKET_URL =
  process.env.NEXT_PUBLIC_WORLD_SOCKET_URL ??
  `${API_BASE_URL.replace(/^http/, "ws")}/ws/world`;
