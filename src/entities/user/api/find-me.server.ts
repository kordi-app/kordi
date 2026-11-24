import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/shared/config/auth";
import type { User } from "../model/types";
import { getMeQuick } from "./get-me";

/**
 * The signed-in user, or null for a guest — without calling the API at all when
 * there's no session cookie, and without waiting long when the API is down.
 */
export async function findMe(): Promise<User | null> {
  const cookieStore = await cookies();
  if (!cookieStore.has(AUTH_COOKIES.ACCESS_TOKEN) && !cookieStore.has(AUTH_COOKIES.REFRESH_TOKEN)) return null;
  try {
    return await getMeQuick();
  } catch {
    return null;
  }
}
