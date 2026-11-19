import ky from "ky";
import { API_BASE_URL } from "@/shared/config/api";

/**
 * Browser → Spring direct client for public (unauthenticated) endpoints.
 * Responses keep the Spring envelope; pair with `unwrap`.
 */
export const publicApiClient = ky.create({
  prefixUrl: `${API_BASE_URL}/api`,
});
