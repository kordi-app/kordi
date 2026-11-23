"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "@/shared/lib/react/use-debounce-value";
import { userQueries } from "@/entities/user";

const DEBOUNCE_MS = 500;

export function useNicknameCheck(nickname: string, currentNickname: string) {
  const debounced = useDebounceValue(nickname, DEBOUNCE_MS);

  const shouldCheck = debounced.length >= 2 && debounced !== currentNickname;
  // still typing: the last result belongs to an older value, so nothing is confirmed yet
  const isSettling =
    nickname !== debounced && nickname.length >= 2 && nickname !== currentNickname;

  const { data, isFetching } = useQuery({
    ...userQueries.checkNickname(debounced),
    enabled: shouldCheck,
  });

  if (isSettling) return "checking" as const;
  if (!shouldCheck) return "idle" as const;
  if (isFetching) return "checking" as const;
  if (data === true) return "duplicated" as const;
  if (data === false) return "available" as const;
  return "idle" as const;
}
