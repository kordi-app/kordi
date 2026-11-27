"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { useDeleteFriendship } from "../lib/use-delete-friendship";
import { FriendAvatar } from "./friend-avatar";
import { FriendRow } from "./friend-row";

/** A friend. Removing takes two taps: the first turns the button into a confirmation. */
export function FriendItem({ friendshipId, name }: { friendshipId: number; name: string }) {
  const t = useTranslations("friends");
  const { mutate, isPending } = useDeleteFriendship();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <FriendRow
      name={name}
      avatar={<FriendAvatar name={name} />}
      actions={
        <Button
          size="sm"
          variant={confirming ? "destructive" : "ghost"}
          disabled={isPending}
          onClick={() => (confirming ? mutate(friendshipId) : setConfirming(true))}
          className={confirming ? undefined : "text-muted-foreground md:pointer-fine:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"}
        >
          {confirming ? t("confirmDelete") : t("remove")}
        </Button>
      }
    />
  );
}
