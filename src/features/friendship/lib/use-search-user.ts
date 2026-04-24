"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "@/shared/lib/react/use-debounce-value";
import { userQueries } from "@/entities/user";

export function useSearchUser(nickname: string) {
  const debounced = useDebounceValue(nickname.trim(), 500);
  return useQuery(userQueries.searchByNickname(debounced));
}
