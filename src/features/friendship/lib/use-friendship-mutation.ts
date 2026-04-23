"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { mapFriendshipError } from "./map-friendship-error";

type QueryKey = readonly unknown[];

interface UseFriendshipMutationOptions<TVars, TResult> {
  mutationFn: (vars: TVars) => Promise<TResult>;
  invalidateKeys: readonly QueryKey[];
  successKey: string;
}

export function useFriendshipMutation<TVars, TResult>({
  mutationFn,
  invalidateKeys,
  successKey,
}: UseFriendshipMutationOptions<TVars, TResult>) {
  const qc = useQueryClient();
  const t = useTranslations();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
      toast.success(t(successKey));
    },
    onError: async (err) => {
      toast.error(t(await mapFriendshipError(err)));
    },
  });
}
