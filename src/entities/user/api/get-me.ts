import { apiClient } from "@/shared/api";
import type { User } from "../model/types";

interface ApiResponse<T> {
  data: T;
}

export async function getMe(): Promise<User> {
  return apiClient.get("api/users/me").json<ApiResponse<User>>().then((res) => res.data);
}
