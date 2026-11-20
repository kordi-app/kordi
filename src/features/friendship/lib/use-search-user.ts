"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "@/shared/lib/react/use-debounce-value";
import { userQueries } from "@/entities/user";

/**
 * Look a nickname up after typing pauses. `settled` is false while what's
 * typed and what was searched differ — the result on screen then belongs to
 * an older query and mustn't be acted on.
 */
export function useSearchUser(nickname: string) {
  const trimmed = nickname.trim();
  const debounced = useDebounceValue(trimmed, 500);
  const query = useQuery(userQueries.searchByNickname(debounced));
  return { ...query, settled: debounced === trimmed };
}
